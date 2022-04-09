
exports.up = function(knex) {
  return knex.schema
    .createTable('entreprises', function (table) {
      table.increments('id');
      table.string('navn');
      table.string('funktion');
      table.string('mail');
      table.string('adresse');
    })
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('entreprises')
};
