import Ember from "ember";
const { Controller, computed } = Ember;
const { notEmpty } = computed;

export default Controller.extend({
  isExpanded: true,

  hasMap: notEmpty('model.hasSourceMap'),

  expandedClass: function() {
    if (this.get('isExpanded')) {
      return 'row_arrow_expanded';
    } else {
      return 'row_arrow_collapsed';
    }
  }.property('hasMap', 'isExpanded'),

  actions: {
    toggleExpand: function() {
      this.toggleProperty('isExpanded');
    }

  }
});
