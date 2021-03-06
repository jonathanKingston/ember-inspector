import Ember from "ember";
import escapeRegExp from "ember-inspector/utils/escape-reg-exp";
import computed from 'ember-new-computed';
const { typeOf, computed: { or, equal, not } } = Ember;

const dateComputed = function() {
  return computed({
    get: function() {
      return null;
    },
    set: function(key, date) {
      if (typeOf(date) === 'date') {
        return date;
      } else if (typeof date === 'number' || typeof date === 'string') {
        return new Date(date);
      }
      return null;
    }
  });
};

export default Ember.Object.extend({
  createdAt: dateComputed(),
  settledAt: dateComputed(),

  parent: null,

  level: function() {
    let parent = this.get('parent');
    if (!parent) {
      return 0;
    }
    return parent.get('level') + 1;
  }.property('parent.level'),

  isSettled: or('isFulfilled', 'isRejected'),

  isFulfilled: equal('state', 'fulfilled'),

  isRejected: equal('state', 'rejected'),

  isPending: not('isSettled'),

  children: function() {
    return [];
  }.property(),

  pendingBranch: function() {
    return this.recursiveState('isPending', 'pendingBranch');
  }.property('isPending', 'children.@each.pendingBranch'),

  rejectedBranch: function() {
    return this.recursiveState('isRejected', 'rejectedBranch');
  }.property('isRejected', 'children.@each.rejectedBranch'),

  fulfilledBranch: function() {
    return this.recursiveState('isFulfilled', 'fulfilledBranch');
  }.property('isFulfilled', 'children.@each.fulfilledBranch'),

  recursiveState: function(prop, cp) {
    if (this.get(prop)) {
      return true;
    }
    for (let i = 0; i < this.get('children.length'); i++) {
      if (this.get('children').objectAt(i).get(cp)) {
        return true;
      }
    }
    return false;
  },

  // Need this observer because CP dependent keys do not support nested arrays
  // TODO: This can be so much better
  stateChanged: function() {
    if (!this.get('parent')) {
      return;
    }
    if (this.get('pendingBranch') && !this.get('parent.pendingBranch')) {
      this.get('parent').notifyPropertyChange('fulfilledBranch');
      this.get('parent').notifyPropertyChange('rejectedBranch');
      this.get('parent').notifyPropertyChange('pendingBranch');
    } else if (this.get('fulfilledBranch') && !this.get('parent.fulfilledBranch')) {
      this.get('parent').notifyPropertyChange('fulfilledBranch');
      this.get('parent').notifyPropertyChange('rejectedBranch');
      this.get('parent').notifyPropertyChange('pendingBranch');
    } else if (this.get('rejectedBranch') && !this.get('parent.rejectedBranch')) {
      this.get('parent').notifyPropertyChange('fulfilledBranch');
      this.get('parent').notifyPropertyChange('rejectedBranch');
      this.get('parent').notifyPropertyChange('pendingBranch');
    }

  }.observes('pendingBranch', 'fulfilledBranch', 'rejectedBranch'),

  updateParentLabel: function() {
    this.addBranchLabel(this.get('label'), true);
  }.observes('label', 'parent'),

  addBranchLabel: function(label, replace) {
    if (Ember.isEmpty(label)) {
      return;
    }
    if (replace) {
      this.set('branchLabel', label);
    } else {
      this.set('branchLabel', this.get('branchLabel') + ' ' + label);
    }

    let parent = this.get('parent');
    if (parent) {
      parent.addBranchLabel(label);
    }
  },

  branchLabel: '',

  matches: function(val) {
    return !!this.get('branchLabel').toLowerCase().match(new RegExp('.*' + escapeRegExp(val.toLowerCase()) + '.*'));
  },

  matchesExactly: function(val) {
    return !!((this.get('label') || '').toLowerCase().match(new RegExp('.*' + escapeRegExp(val.toLowerCase()) + '.*')));
  },



  // EXPANDED / COLLAPSED PROMISES

  isExpanded: false,

  isManuallyExpanded: undefined,

  stateOrParentChanged: function() {
    let parent = this.get('parent');
    if (parent) {
      Ember.run.once(parent, 'recalculateExpanded');
    }
  }.observes('isPending', 'isFulfilled', 'isRejected', 'parent'),

  _findTopParent: function() {
    let parent = this.get('parent');
    if (!parent) {
      return this;
    } else {
      return parent._findTopParent();
    }
  },

  recalculateExpanded: function() {
    let isExpanded = false;
    if (this.get('isManuallyExpanded') !== undefined) {
      isExpanded = this.get('isManuallyExpanded');
    } else {
      let children = this._allChildren();
      for (let i = 0, l = children.length; i < l; i++) {
        let child = children[i];
        if (child.get('isRejected')) {
          isExpanded = true;
        }
        if (child.get('isPending') && !child.get('parent.isPending')) {
          isExpanded = true;
        }
        if (isExpanded) {
          break;
        }
      }
      let parents = this._allParents();
      if (isExpanded) {
        parents.forEach(function(parent) {
          parent.set('isExpanded', true);
        });
      } else if (this.get('parent.isExpanded')) {
        this.get('parent').recalculateExpanded();
      }
    }
    this.set('isExpanded', isExpanded);
    return isExpanded;
  },

  isVisible: function() {
    if (this.get('parent')) {
      return this.get('parent.isExpanded') && this.get('parent.isVisible');
    }
    return true;
  }.property('parent.isExpanded', 'parent', 'parent.isVisible'),

  _allChildren: function() {
    let children = Ember.$.extend([], this.get('children'));
    children.forEach(function(item) {
      children = Ember.$.merge(children, item._allChildren());
    });
    return children;
  },

  _allParents: function() {
    let parent = this.get('parent');
    if (parent) {
      return Ember.$.merge([parent], parent._allParents());
    } else {
      return [];
    }
  }
});
