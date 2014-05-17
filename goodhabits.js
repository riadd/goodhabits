var habits = [];

addHabit = function(name) {
  newHabit = {
    id: habits.length,
    name: name,
    history: []
  }

  habits.push(newHabit)
 
  HabitDB.saveHabits()
  renderHabits();
}

trashHabit = function(id) {
  habits.remove(function(h){
    return h.id == id
  });

  HabitDB.saveHabits();
  renderHabits();
}

renderHabits = function() {
  var tmpl = $('#habitsTmpl').html()
  var out = Mustache.render(tmpl, {habits: habits});
  $('#habits').html(out);
}

var HabitDB = {
  loadHabits: function() {
    if (Lawnchair) {
      db = Lawnchair({name:'gh-db', adapter:'indexed-db'}, function(db) {
        db.get('habits', function(rec) {
          if (rec) {
            habits = rec.values
          }

          renderHabits();
        });
      });
    }
  },

  saveHabits: function() {
    db.save({key: 'habits', values: habits})
  },
}

$(function() {
  HabitDB.loadHabits();

  $('#newHabit').submit(function(event) {
    name = $('input').val()
    $('input')[0].value = ""
    event.preventDefault()
    
    addHabit(name)
  });
});


