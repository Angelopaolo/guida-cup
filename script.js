document.addEventListener("DOMContentLoaded", function () {
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((question) => {
    question.addEventListener("click", (e) => {
      e.stopPropagation();

      const currentItem = question.parentElement;
      const isActive = currentItem.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach((item) => {
        item.classList.remove("active");
        item.querySelector(".faq-question").setAttribute("aria-expanded", "false");
      });

      if (!isActive) {
        currentItem.classList.add("active");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.remove("active");
      item.querySelector(".faq-question").setAttribute("aria-expanded", "false");
    });
  });
});

document.getElementById("enterBtn").addEventListener("click", function() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
});