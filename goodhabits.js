var habits = [];

// model code

onHabitChanged = function() {
  HabitDB.saveHabits();
  renderShortList();
  renderHabitList();
  renderHabitDetails();
};

getHabit = function(id) {
  var habit = habits.find(function(h){return h.id == id;});
  assert(habit);
  return habit;
};

addHabit = function(name) {
  if (habits.length>0) {
    maxId = habits.max(function(h){return h.id;}).id;
    
  } else {
    // this will make the id's start with 1 which makes it easier to
    // check for valid IDs if they can't be zero
    maxId = 0;
  }

  newHabit = {
    id: maxId+1,
    name: name,
    history: [],
    notes: []
  };

  habits.push(newHabit)
  onHabitChanged()
}

addHabitNote = function(id, note) {
  var habit = getHabit(id);

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
  showingHabitDetails = id;
  renderHabitDetails();
};

renderShortList = function() {
  date = Date.create()
  counts = []

  for (var i=0; i<14; i++) {
    counts.unshift({
      count: habits.count(function(h) {return hasHabitDate(h.id, date)}),
      date: date.clone()
    })

    date.rewind({day:1})
  }

  var data = {
    labels: counts.map(function(c) {return c.date.format('{yyyy}-{MM}-{dd}')}),
    datasets: [
        {
            fillColor: "rgba(220,220,220,0.2)",
            strokeColor: "rgba(220,220,220,1)",
            pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
            data: counts.map(function(c) {return c.count;})
        }
    ]
  };

  var options = {
    legendTemplate: '',
    scaleShowLabels: false,
    scaleLabel: "<%=value%>AAA",
    bezierCurve: true,
    skipLabels: 5
  };

  ctx = $('#habitGraph').get(0).getContext('2d');
  new Chart(ctx).Line(data, options);
};

renderHabitList = function() {
  relativeTime = function(habit) {
    last = habit.history.last();
    if (!last) return null;

    return Date.create(last).daysAgo();
  };

  outHabits = habits.map(function(h){
    daysAgo = relativeTime(h);

    if (daysAgo === null)
      timeTxt = "";
    else if (daysAgo > 0)
      timeTxt = daysAgo + " days ago";
    else
      timeTxt = "today";

    habit = {
      id: h.id,
      name: h.name,
      recentDays: [],
      times: h.history.length,
      notes: h.notes.length,
      timeTxt: timeTxt,
      daysAgo: daysAgo === null ? 1000 : daysAgo
    };

    date = Date.create();
    for (var i=0; i<14; i++) {
      dateEntry = {
        id: h.id,
        checked: hasHabitDate(h.id, date) ? "checked" : "",
        date: date.format('{yyyy}-{MM}-{dd}'),
        title: date.format('{Weekday} {dd}.{MM}.{yyyy}')
      };

      habit.recentDays.unshift(dateEntry);
      date.rewind({day:1});
    }

    return habit;
  });

  outHabits = outHabits.sortBy(function(h) {
    return h.daysAgo * 1000 - h.times;
  });

  var tmpl = $('#habitsTmpl').html();
  var out = Mustache.render(tmpl, {habits: outHabits});
  $('#habits').html(out);

  $('input[type="checkbox"]').change(function (e) {
    id = $(this).closest('li').data('id');
    toggleHabitDate(id, Date.create(this.dataset.date));
  });

  $('#habits span').click(function(e) {
    id = $(this).closest('li').data('id');
    showHabitDetails(id);
  });
};

renderHabitDetails = function() {
  if (!showingHabitDetails) {
    $('#details').hide()  
    return;
  }

  habit = getHabit(showingHabitDetails)

  outHabitDetails = {
    id: habit.id,
    name: habit.name,
    times: habit.history.length,
    notes: habit.notes.sortBy(function(n) {
      return n.date;

    }, true).map(function(n) {
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

          renderShortList()
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


