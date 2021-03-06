import Ember from "ember";
const { computed: { oneWay } } = Ember;

export default Ember.ObjectController.extend({
  needs: ['model-types'],

  modelTypes: oneWay('controllers.model-types').readOnly(),

  selected: function() {
    return this.get('model') === this.get('modelTypes.selected');
  }.property('modelTypes.selected')
});
