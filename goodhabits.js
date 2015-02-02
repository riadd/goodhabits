var habits = [];

// model code

onHabitChanged = function() {
  renderShortList();
  renderHabitList();
  renderHabitDetails();
};

getHabit = function(id) {
  return habitTable.get(id);
};

addHabit = function(name) {
  var newHabit = habitTable.insert({
    name: name,
    history: [],
    notes: []
  });
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
  var habit = getHabit(id);
  habit.deleteRecord();

  if (showingHabitDetails == id)
    showingHabitDetails = null

  onHabitChanged()
}

hasHabitDate = function(id, date) {
  return habitDateIndex(id, date) > -1;
}

habitDateIndex = function(id, date) {
  var habit = getHabit(id)
  date = date.beginningOfDay()

  var history = habit.get('history')

  for (var i=0; i<history.length(); i++) {
    var d = history.get(i);

    if (d.beginningOfDay().is(date))
      return i;
  }

  return -1;
}

toggleHabitDate = function(id, date) {
  var habit = getHabit(id)
  var history = habit.get('history')

  if (hasHabitDate(id, date)) {
    date = date.beginningOfDay()
    history.remove(habitDateIndex(id, date));
  } else {
    history.push(date);
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
  var graph = $('#habitGraph');
  
  if (graph.length <= 0) {
    return;
  }

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

  ctx = graph.get(0).getContext('2d');
  new Chart(ctx).Line(data, options);  
}

renderHabitList = function() {
  relativeTime = function(habit) {
    var history = habit.get('history');

    if (history.length() == 0)
      return null;

    var last = history.get(history.length()-1);
    return Date.create(last).daysAgo();
  };

  var habits = habitTable.query();

  outHabits = habits.map(function(h){
    daysAgo = relativeTime(h);

    var history = h.get('history')

    if (daysAgo === null)
      var timeTxt = "";
    else if (daysAgo > 0)
      var timeTxt = daysAgo + " days ago";
    else
      var timeTxt = "today";

    habit = {
      id: h.getId(),
      name: h.get('name'),
      recentDays: [],
      times: history.length(),
      notes: 0, //h.notes.length,
      timeTxt: timeTxt,
      daysAgo: 0 //daysAgo === null ? 1000 : daysAgo
    };

    date = Date.create();
    for (var i=0; i<7; i++) {
      dateEntry = {
        id: h.getId(),
        checked: hasHabitDate(h.getId(), date) ? "checked" : "",
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
    id = $(this).closest('tr').data('id');
    toggleHabitDate(id, Date.create(this.dataset.date));
  });

  $('#habits tr').click(function(e) {
    id = $(this).closest('tr').data('id');
    showHabitDetails(id);
  });
};

renderHabitDetails = function() {
  if (!showingHabitDetails) {
    $('#details').hide()  
    return;
  }

  var habit = getHabit(showingHabitDetails);

  if (!habit)
    return;

  var history = habit.get('history');

  outHabitDetails = {
    id: habit.getId(),
    name: habit.get('name'),
    times: history.length(),
    notes: []
    // notes: habit.get(notes.sortBy(function(n) {
    //   return n.date;

    // }, true).map(function(n) {
    //   return {
    //     text: n.text,
    //     date: n.date.format('{dd}.{MM}.{yyyy}')
    //   }
    // })
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
    client = new Dropbox.Client({key: '1atsdxrgq619bwn'});

    // Try to finish OAuth authorization.
    client.authenticate({interactive: false}, function (error) {
      if (error) {
        alert('Authentication error: ' + error);
      }

      if (!client.isAuthenticated())
        return;

      manager = client.getDatastoreManager();
      manager.openDefaultDatastore(function (error, datastore) {
        if (error) {
          alert('Error opening default datastore: ' + error);
        }

        $('#newHabit').show();
        $('#connect').hide();

        datastore.recordsChanged.addListener(function (event) {
          console.log('records changed:', event.affectedRecordsForTable('habits'));
          onHabitChanged();
        });

        habitTable = datastore.getTable('habits');
        onHabitChanged();
      });
    });
  },
}

$(function() {
  HabitDB.loadHabits();

  $('#newHabit').submit(function(e) {
    name = $('input').val()
    $('input')[0].value = ""
    e.preventDefault()

    addHabit(name)
  });

  $('#connect').click(function(e) {
    client.authenticate();
  });
});


