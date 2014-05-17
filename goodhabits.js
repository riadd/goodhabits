var habits = [];

addHabit = function(name) {
  newHabit = {
    name: name,
    history: []
  }

  habits.push(newHabit)
}

addTestHabits = function() {
  addHabit('Floss')
  addHabit('Zero Inbox')
  addHabit('Go running')
}

renderHabits = function() {
  var tmpl = $('#habitsTmpl').html()
  var out = Mustache.render(tmpl, {habits: habits});
  $('#habits').html(out);
}

$(function() {
  addTestHabits();

  $('#newHabit').submit(function(event) {
    name = $('input').val()
    addHabit(name)
    $('input')[0].value = ""
    renderHabits()
    event.preventDefault()
  });

  renderHabits();
});


