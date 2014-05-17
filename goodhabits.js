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

renderMain = function() {
  var tmpl = $('#mainTmpl').html()
  var out = Mustache.render(tmpl, {habits: habits});
  $('body').html(out);
}

$(function() {
  addTestHabits();
  renderMain();
});


