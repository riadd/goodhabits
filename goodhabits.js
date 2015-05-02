var habits = [];

// model code

onHabitChanged = function() {
  renderDayBar();
  renderHabitList();
  renderHabitDetails();
  renderFooter();
};

getHabit = function(id) {
  return habitTable.get(id);
};

addHabit = function(name) {
  var newHabit = habitTable.insert({
    name: name,
    history: [],
    notes: '',
    lastUpdate: Date.create('in 3 seconds')
  });

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
  habit.set('lastUpdate', Date.create('in 3 seconds'));

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
var cursorPosStart, cursorPosEnd;
var notificationTimeout;

showHabitDetails = function(id) {
  showingHabitDetails = id;
  renderHabitDetails();
  renderHabitList();
};

showNotification = function(text) {
  $('#notification').text(text).addClass('show');
  clearTimeout(notificationTimeout);

  notificationTimeout = setTimeout(function() {
    $('#notification').removeClass('show');
  }, 2000);
}

renderDayBar = function() {
  var habits = habitTable.query(),
    date = Date.create(),
    txt = "",
    added = false,
    rewindDays = 14;

  date.rewind({day:rewindDays-1});

  for (var i=0; i<rewindDays; i++) {
    count = habits.count(function(h) {
      return hasHabitDate(h.getId(), date)
    });

    if (count > 0) {
      added = true;
    }

    if (added) {
      tmpl = "<li style='height:{{height}}px;margin-top:{{margin}}' title='{{count}} habits'><span>{{count}}</span></li>";
      txt += Mustache.render(tmpl, {height:2*count, margin:30-2*count, count:count});
    }
    
    date.advance({day:1});
  }

  $('#dayBar').html(txt);
}

renderFooter = function() {
  var habits = habitTable.query();
  $('#footer').html(habits.length+" Total Habits");
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
  var now = Date.create();

  outHabits = habits.map(function(h) {
    daysAgo = relativeTime(h);

    var history = h.get('history')

    if (daysAgo === null)
      var timeTxt = "";

    else if (daysAgo == 0)
      var timeTxt = "today";

    else if (daysAgo == 1)
      var timeTxt = "yesterday"

    else if (daysAgo < 7)
      var timeTxt = daysAgo + " days ago";

    else {
      var weeksAgo = Math.floor(daysAgo / 7);

      if (weeksAgo == 1)
        var timeTxt = "1 week ago";

      else if (weeksAgo < 4)
        var timeTxt = weeksAgo + " weeks ago";

      else {
        var monthsAgo = Math.floor(weeksAgo / 4)
        if (monthsAgo == 1)
          var timeTxt = "1 month ago";
        else 
          var timeTxt = monthsAgo + " months ago";
      }
        
    }

    var lastUpdate = h.get('lastUpdate')
    var highlight = lastUpdate == undefined ? false : lastUpdate.isAfter(now);

    habit = {
      id: h.getId(),
      name: h.get('name'),
      recentDays: [],
      times: history.length(),
      notes: h.get('notes'),
      timeTxt: timeTxt,
      daysAgo: daysAgo === null ? 1000 : daysAgo,
      selected: h.getId() == showingHabitDetails,
      highlight: highlight
    };

    date = Date.create();
    for (var i=0; i<7; i++) {
      dateEntry = {
        id: h.getId(),
        checked: hasHabitDate(h.getId(), date) ? "checked" : "",
        date: date.format('{yyyy}-{MM}-{dd}'),
        title: date.format('{Weekday} {dd}.{MM}.{yyyy}'),
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

  if (showingHabitDetails) {
    $(".notes textarea")[0].selectionStart = cursorPosStart;
    $(".notes textarea")[0].selectionEnd = cursorPosEnd;
    $(".notes textarea")[0].focus();

    $(".notes textarea").bind('input propertychange', (function(e) {
      var habit = getHabit(showingHabitDetails);

      cursorPosStart = $(this).prop("selectionStart");
      cursorPosEnd = $(this).prop("selectionEnd");

      habit.set('notes', $(this).val());
      showNotification("Saved note");
    }).debounce(1000));  
  }

  $('#habits tr .name').click(function(e) {
    e.preventDefault();

    id = $(this).closest('tr').data('id');
    
    if (id && id == showingHabitDetails)  {
      showingHabitDetails = null
    } else {
      showHabitDetails(id);
    }

    renderHabitDetails();
    renderHabitList();
  });

  $('#habits td.trash').click(function(e) {
    e.preventDefault();

    id = $(this).closest('tr').data('id');
    trashHabit(id);
  });
};

renderHabitDetails = function() {
  // if (!showingHabitDetails) {
  //   $('#details').hide()  
  //   return;
  // }

  // var habit = getHabit(showingHabitDetails);

  // if (!habit)
  //   return;

  // var history = habit.get('history');

  // outHabitDetails = {
  //   id: habit.getId(),
  //   name: habit.get('name'),
  //   times: history.length(),
  //   notes: habit.get('notes')
  // }

  // if ($('#notes textarea').is(':focus')) {
  //   return;
  // }

  // var tmpl = $('#habitDetailsTmpl').html()
  // var out = Mustache.render(tmpl, outHabitDetails);
  // $('#details').html(out).show();

  // $('#notes textarea').val(habit.get('notes'));

  // $("#notes textarea").bind('input propertychange', (function(e) {
  //   var habit = getHabit(showingHabitDetails);
  //   habit.set('notes', $(this).val())
  // }).debounce(500));

  // $('#details .close').click(function(e) {
  //   showHabitDetails()
  // })

  // $('#details .trash').click(function(e) {
  //   trashHabit(showingHabitDetails)
  // })
}

renderGraph = function() {
  var graph = $('#graph');
  
  if (graph.length <= 0) {
    return;
  }

  var habits = habitTable.query();
  var date = Date.create();
  var counts = [];

  for (var i=0; i<14; i++) {
    counts.unshift({
      count: habits.count(function(h) {
        return hasHabitDate(h.getId(), date)
      }),
      date: date.clone()
    })

    date.rewind({day:1})
  }

  var data = {
    labels: counts.map(function(c) {
      // return c.date.format('{yyyy}-{MM}-{dd}')
      return '';
    }),
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
  new Chart(ctx).Bar(data, options);  
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
    e.preventDefault();

    addHabit(name)
  });

  $('#connect').click(function(e) {
    client.authenticate();
  });

  $(window).resize(function(e) {
    // $('#graph')[0].width = $(window).width();
  });

});


