var habits = [];

// model code

onHabitChanged = function() {
  HabitDB.saveHabits()
  renderHabitList()
  renderHabitDetails()
}

getHabit = function(id) {
  var habit = habits.find(function(h){return h.id == id})
  assert(habit)
  return habit;
}

addHabit = function(name) {
  if (habits.length>0) {
    maxId = habits.max(function(h){return h.id}).id
    
  } else {
    // this will make the id's start with 1 which makes it easier to
    // check for valid IDs if they can't be zero
    maxId = 0
  }

  newHabit = {
    id: maxId+1,
    name: name,
    history: [],
    notes: []
  }

  habits.push(newHabit)
  onHabitChanged()
}

addHabitNote = function(id, note) {
  var habit = getHabit(id)

  newNote = {
    text: note,
    date: Date.create()
  }

  habit.notes.push(newNote)
  onHabitChanged()
}

trashHabit = function(id) {
  habits.remove(function(h){return h.id == id});

  if (showingHabitDetails == id)
    showingHabitDetails = null

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

// view code

var showingHabitDetails;

showHabitDetails = function(id) {
  showingHabitDetails = id
  renderHabitDetails()
}

renderHabitList = function() {
  outHabits = habits.map(function(h){
    habit = {
      id: h.id,
      name: h.name,
      recentDays: [],
      times: h.history.length
    }

    date = Date.create()
    for (var i=0; i<5; i++) {
      dateEntry = {
        id: h.id,
        checked: hasHabitDate(h.id, date) ? "checked" : "",
        date: date.format('{yyyy}-{MM}-{dd}'),
        title: date.format('{Weekday} {dd}.{MM}.{yyyy}')
      }

      habit.recentDays.unshift(dateEntry);
      date.rewind({day:1})
    }

    return habit;
  });

  var tmpl = $('#habitsTmpl').html()
  var out = Mustache.render(tmpl, {habits: outHabits})
  $('#habits').html(out)

  $('input[type="checkbox"]').change(function (e) {
    id = $(this).closest('li').data('id')
    toggleHabitDate(id, Date.create(this.dataset.date))
  })

  $('#habits span').click(function(e) {
    id = $(this).closest('li').data('id')
    showHabitDetails(id)
  })
}

renderHabitDetails = function() {
  if (!showingHabitDetails) {
    $('#details').hide()  
    return
  }

  habit = getHabit(showingHabitDetails)

  outHabitDetails = {
    id: habit.id,
    name: habit.name,
    notes: habit.notes.map(function(n) {
      return {
        text: n.text,
        date: n.date.format('{dd}.{MM}.{yyyy}')
      }
    })
  }

  var tmpl = $('#habitDetailsTmpl').html()
  var out = Mustache.render(tmpl, outHabitDetails);
  $('#details').html(out).show();

  $('#newNote').submit(function(event) {
    txt = $('#details input').val()
    $('#details input')[0].value = ""
    event.preventDefault()

    addHabitNote(showingHabitDetails, txt)
  });

  $('#details .close').click(function(e) {
    showHabitDetails()
  })

  $('#details .trash').click(function(e) {
    trashHabit(showingHabitDetails)
  })
}

// controller

var HabitDB = {
  loadHabits: function() {
    if (Lawnchair) {
      db = Lawnchair({name:'gh-db', adapter:'indexed-db'}, function(db) {
        db.get('habits', function(rec) {
          if (rec) {
            habits = rec.values
          }

          // update old habits
          habits = habits.map(function(h) {
            if (!h.notes) {
              h.notes = [];
            }

            return h;
          })

          renderHabitList()
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


