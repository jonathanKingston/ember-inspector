import Ember from "ember";
import TabRoute from "ember-inspector/routes/tab";

const set = Ember.set;

export default TabRoute.extend({
  setupController: function(controller, model) {
    this._super(controller, model);

    const type = this.modelFor('model_type');

    controller.set('modelType', type);

    this.get('port').on('data:recordsAdded', this, this.addRecords);
    this.get('port').on('data:recordsUpdated', this, this.updateRecords);
    this.get('port').on('data:recordsRemoved', this, this.removeRecords);
    this.get('port').one('data:filters', this, function(message) {
      this.set('controller.filters', message.filters);
    });
    this.get('port').send('data:getFilters');
    this.get('port').send('data:getRecords', { objectId: type.objectId });
  },

  model: function() {
    return [];
  },

  deactivate: function() {
    this.get('port').off('data:recordsAdded', this, this.addRecords);
    this.get('port').off('data:recordsUpdated', this, this.updateRecords);
    this.get('port').off('data:recordsRemoved', this, this.removeRecords);
    this.get('port').send('data:releaseRecords');
  },

  updateRecords: function(message) {
    let route = this;
    message.records.forEach(function(record) {
      const currentRecord = route.get('currentModel').findProperty('objectId', record.objectId);
      if (currentRecord) {
        set(currentRecord, 'columnValues', record.columnValues);
        set(currentRecord, 'filterValues', record.filterValues);
        set(currentRecord, 'searchIndex', record.searchIndex);
        set(currentRecord, 'color', record.color);
      }
    });

  },

  addRecords: function(message) {
    this.get('currentModel').pushObjects(message.records);
  },

  removeRecords: function(message) {
    this.get('currentModel').removeAt(message.index, message.count);
  },

  actions: {
    inspectModel: function(model) {
      this.get('port').send('data:inspectModel', { objectId: Ember.get(model, 'objectId') });
    }
  }
});
