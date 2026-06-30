const subjects = [
  {
    "id": 7,
    "name": "Programming in C",
    "code": "BCA101",
    "semester": 1,
    "examDate": null
  }
];

const anyExamsScheduled = subjects.some(s => s.examDate);
console.log("anyExamsScheduled:", anyExamsScheduled);
