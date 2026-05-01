document.addEventListener("DOMContentLoaded", function () {
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((question) => {
    question.addEventListener("click", function (event) {
      event.stopPropagation();

      const currentItem = question.parentElement;
      const isActive = currentItem.classList.contains("active");

      document.querySelectorAll(".faq-item").forEach((item) => {
        item.classList.remove("active");

        const btn = item.querySelector(".faq-question");
        if (btn) {
          btn.setAttribute("aria-expanded", "false");
        }
      });

      if (!isActive) {
        currentItem.classList.add("active");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", function () {
    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.remove("active");

      const btn = item.querySelector(".faq-question");
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });

  const enterBtn = document.getElementById("enterBtn");
  const overlay = document.getElementById("overlay");
  const mainContent = document.getElementById("mainContent");

  if (enterBtn && overlay && mainContent) {
    enterBtn.addEventListener("click", function () {
      overlay.style.display = "none";
      mainContent.style.display = "block";
    });
  }
});
