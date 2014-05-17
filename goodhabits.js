var habits = [];

getHabit = function(id) {
  var habit = habits.find(function(h){return h.id == id})
  assert(habit)
  return habit;
}

onHabitChanged = function() {
  HabitDB.saveHabits()
  renderHabits();
}

addHabit = function(name) {
  newHabit = {
    id: "habit-"+habits.length,
    name: name,
    history: []
  }

  habits.push(newHabit)
  onHabitChanged()
}

trashHabit = function(id) {
  habits.remove(function(h){return h.id == id});
  onHabitChanged()
}

hasHabitDate = function(id, date) {
  var habit = getHabit(id)
  date = date.beginningOfDay()

  return habit.history.any(function(d) {
    return d.beginningOfDay().is(date)
  })
}

toggleHabitDate = function(id, date) {
  var habit = getHabit(id)

  if (hasHabitDate(id, date)) {
    date = date.beginningOfDay()
    habit.history.remove(function(d) {return d.beginningOfDay().is(date)})
  } else {
    habit.history.push(date);
  }

  onHabitChanged();
}

assert = function(expr) {
  if (!expr)
    debug.break
}

renderHabits = function() {
  outHabits = habits.map(function(h){
    habit = {
      id: h.id,
      name: h.name,
      recentDays: []
    }

    date = Date.create()
    for (var i=0; i<3; i++) {
      dateEntry = {
        id: h.id,
        checked: hasHabitDate(h.id, date) ? "checked" : "",
        date: date.format('{yyyy}-{MM}-{dd} {hh}:{mm}')
      }

      habit.recentDays.unshift(dateEntry);
      date.rewind({day:1})
    }

    return habit;
  });

  var tmpl = $('#habitsTmpl').html()
  var out = Mustache.render(tmpl, {habits: outHabits});
  $('#habits').html(out);

  $('input[type="checkbox"]').change(function (e) {
    toggleHabitDate(this.dataset.id, Date.create(this.dataset.date))
  });
}

var HabitDB = {
  loadHabits: function() {
    if (Lawnchair) {
      db = Lawnchair({name:'gh-db', adapter:'indexed-db'}, function(db) {
        db.get('habits', function(rec) {
          if (rec) {
            habits = rec.values
          }

          renderHabits()
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


