import { Component, OnInit } from '@angular/core';
import { Task } from '../../models/task';
import { Category } from '../../models/category';
import { CalendarService } from '../../services/calendar-service/calendar.service';
import { TaskService } from '../../services/task-service/task.service';
import { CategoryService } from '../../services/category-service/category.service';

declare var $: any;
declare var flatpickr: any;

@Component({
  selector: 'app-list',
  providers: [CalendarService, TaskService, CategoryService],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit {

  tasks = [];
  categories = [];
  selectedCategoryId = null;

  constructor(
    private calendarService: CalendarService,
    private taskService: TaskService,
    private categoryService: CategoryService
  ) { }

  ngOnInit() {
    flatpickr('.flatpickrStart', { utc: true, enableTime: true });
    flatpickr('.flatpickrEnd', { utc: true, enableTime: true });

    this.initializeCategories();
    this.initializeCategoryTasks(true);
  }

  initializeCategoryTasks(firstLoad) {
    if (!this.selectedCategoryId) {
      this.initializeAllTasks(firstLoad);
    } else {
      var that = this;
      $.when(this.categoryService.getCategoryTasks(this.selectedCategoryId)).done(function (response) {
        that.tasks.length = 0;
        let tasks = JSON.parse(response._body);
        for (var i = 0; i < tasks.length; i++) {
          that.tasks.push(tasks[i]);
        }
      });
    }
  }

  initializeAllTasks(firstLoad) {
    var that = this;
    $.when(this.taskService.getTasksForUser(localStorage.getItem("user_id"))).done(function (response) {
      let tasks = JSON.parse(response._body);
      that.tasks.length = 0;
      for (var i = 0; i < tasks.length; i++) {
        that.tasks.push(tasks[i]);
        if (firstLoad) { that.calendarService.appendTaskToCalendar(tasks[i]); }
      }
    });
  }

  addTask(taskInput, startDateInput, endDateInput, event) {
    if(event.keyCode == 13 || event.type === "click") {
      if(taskInput.value && startDateInput.value && endDateInput.value) {
        var that = this;
        let task = new Task(null, taskInput.value, startDateInput.value, endDateInput.value, null, parseInt(this.selectedCategoryId), parseInt(localStorage.getItem("user_id"))); // gotta change this to category id
        $.when(this.taskService.createTask(task)).done(function (response) {
          var realTask = JSON.parse(response._body);
          that.tasks.push(realTask);
          that.calendarService.appendTaskToCalendar(realTask);
          taskInput.value = startDateInput.value = endDateInput.value = null;
        });
      } else {
        alert('please fill out all form fields');
      }
    }
  }

  removeTask(task) {
    this.taskService.deleteTask(task.id); // race condition here between ui and db, maybe change?
    for (var i = 0; i < this.tasks.length; i ++) {
      if (this.tasks[i] === task) {
        this.tasks.splice(i, 1);
      }
    }
  }

  // category logic
  initializeCategories() {
    var that = this;
    $.when(this.categoryService.getCategoriesForUser(localStorage.getItem("user_id"))).done(function (response) {
      let categories = JSON.parse(response._body);
      for (var i = 0; i < categories.length; i++) {
        that.categories.push(categories[i]);
      }
    });
  }

  addCategory(categoryInput, event) {
    if(event.keyCode == 13 || event.type === "click") {
      if(categoryInput.value) {
        let that = this;
        let category = new Category(null, categoryInput.value, parseInt(localStorage.getItem("user_id")));
        $.when(this.categoryService.createCategory(category)).done(function (response) {
          let realCategory = JSON.parse(response._body);
          that.categories.push(realCategory);
          that.hideCategoryInput(realCategory);
        });
      } else {
        alert('Please enter a category');
      }
    }
  }

  selectCategory(event, category) {
    if (!category) {
      this.initializeAllTasks(false);
      this.selectedCategoryId = null;
    } else {
      this.selectedCategoryId = category.id;
      this.initializeCategoryTasks(false);
    }
  }

  deleteCategory(category, event) {
    event.stopPropagation(); // click event propagation was killing me
    var response = window.confirm("Are you sure you want to delete category: " + category.name + "?");
    if (response) {
      var that = this;
      if (category.id === this.selectedCategoryId) { this.selectedCategoryId = null; } // if you delete current category
      $.when(this.categoryService.deleteCategory(category.id)).done(function (response) {
        for (var i = 0; i < that.categories.length; i++) {
          if (that.categories[i] === category) { that.categories.splice(i, 1); }
        }
        that.initializeCategoryTasks(false);
      })
    }
  }

  showCategoryInput() {
    $('.js-category-label').hide();
    $('.js-category-input').show();
  }

  hideCategoryInput(categoryInput) {
    categoryInput.value = null;
    $('.js-category-input').hide();
    $('.js-category-label').show();
  }
}
