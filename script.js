(function() {
  function expandElementHeight(element) {
    element.style.height = "auto";
    var border = element.offsetHeight - element.clientHeight;
    element.style.height = (element.scrollHeight + border) + "px";
  }

  function attachAutoExpand(inputSelector) {
    var elements = document.querySelectorAll(inputSelector);
    elements.forEach(function(element) {
      expandElementHeight(element);
      element.addEventListener("input", function() {
        expandElementHeight(this);
      });

      if (element.getAttribute("rows") === "1") {
        element.addEventListener("keydown", function(event) {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        });
      }
    });
  }

  window.autoExpandInput = function(inputSelector) {
    attachAutoExpand(inputSelector);
  };
})();

window.addEventListener("DOMContentLoaded", function() {
  autoExpandInput(".expandable_input");
});


// STEP 1: Global variables / state
const STORAGE_KEY = "readingLogPosts";
let posts = [];
let editingPostId = null;

const GENRE_LABELS = {
  fiction: "Fiction & Literature",
  nonfiction: "Non Fiction"
};

// STEP 2: DOM element selection
const form = document.getElementById("log-form");

const titleInput = document.getElementById("book-title");
const authorInput = document.getElementById("author");
const dateInput = document.getElementById("date");
const minutesInput = document.getElementById("minutes");
const genreInput = document.getElementById("genre");
const subgenreInput = document.getElementById("subgenre");
const commentsInput = document.getElementById("comments");
const usernameInput = document.getElementById("username");

const titleError = document.getElementById("book-title-error");
const commentsError = document.getElementById("comments-error");

const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");
const postsContainer = document.getElementById("posts");

// STEP 3: Utility functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error("Could not save posts:", error);
  }
}

function loadPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Could not load posts:", error);
    return [];
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString + "T00:00:00").toLocaleDateString();
}

function refreshTextareaSizes() {
  document.querySelectorAll(".expandable_input").forEach(function(element) {
    element.dispatchEvent(new Event("input"));
  });
}

// STEP 4: Render posts
function renderPosts() {
  postsContainer.innerHTML = "";

  if (posts.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No entries yet. Be the first to log a book!";
    postsContainer.appendChild(empty);
    return;
  }

  posts.forEach(function(post) {
    const article = document.createElement("article");
    article.className = "post";

    const title = document.createElement("h3");
    title.textContent = post.title;

    const meta = document.createElement("p");
    meta.className = "post-meta";
    const details = [
      post.author ? "by " + post.author : "",
      formatDate(post.date),
      post.minutes ? post.minutes + " min" : "",
      GENRE_LABELS[post.genre] || "",
      post.subgenre,
      post.username ? "logged by " + post.username : ""
    ].filter(Boolean);
    meta.textContent = details.join(" · ");

    const content = document.createElement("p");
    content.textContent = post.content;

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.dataset.action = "edit";
    editButton.dataset.id = post.id;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = post.id;

    actions.append(editButton, deleteButton);
    article.append(title, meta, content, actions);
    postsContainer.appendChild(article);
  });
}

// STEP 5: Validation
function showError(input, errorElement, message) {
  errorElement.textContent = message;
  input.classList.add("invalid");
}

function clearErrors() {
  [titleError, commentsError].forEach(function(element) {
    element.textContent = "";
  });
  [titleInput, commentsInput].forEach(function(input) {
    input.classList.remove("invalid");
  });
}

function validateForm() {
  clearErrors();
  let isValid = true;

  if (titleInput.value.trim() === "") {
    showError(titleInput, titleError, "Please enter a book title.");
    isValid = false;
  }

  if (commentsInput.value.trim() === "") {
    showError(commentsInput, commentsError, "Please add a comment about the book.");
    isValid = false;
  }

  return isValid;
}

// STEP 6: Handle form submission (new post OR update)
form.addEventListener("submit", function(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = {
    title: titleInput.value.trim(),
    author: authorInput.value.trim(),
    date: dateInput.value,
    minutes: minutesInput.value,
    genre: genreInput.value,
    subgenre: subgenreInput.value.trim(),
    content: commentsInput.value.trim(),
    username: usernameInput.value.trim()
  };

  if (editingPostId) {
    const post = posts.find(function(p) { return p.id === editingPostId; });
    if (post) {
      Object.assign(post, formData, { updatedAt: new Date().toISOString() });
    }
  } else {
    const newPost = Object.assign({ id: generateId() }, formData, {
      timestamp: new Date().toISOString()
    });
    posts.unshift(newPost);
  }

  savePosts();
  renderPosts();
  resetForm();
});

function resetForm() {
  form.reset();
  editingPostId = null;
  submitButton.textContent = "Submit";
  cancelEditButton.hidden = true;
  clearErrors();
  refreshTextareaSizes();
}

cancelEditButton.addEventListener("click", resetForm);

// STEP 7: Edit and Delete (event delegation)
postsContainer.addEventListener("click", function(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === "delete") {
    deletePost(id);
  } else if (button.dataset.action === "edit") {
    startEdit(id);
  }
});

function deletePost(id) {
  posts = posts.filter(function(post) { return post.id !== id; });
  savePosts();
  renderPosts();

  if (editingPostId === id) {
    resetForm();
  }
}

function startEdit(id) {
  const post = posts.find(function(p) { return p.id === id; });
  if (!post) return;

  titleInput.value = post.title;
  authorInput.value = post.author;
  dateInput.value = post.date;
  minutesInput.value = post.minutes;
  genreInput.value = post.genre;
  subgenreInput.value = post.subgenre;
  commentsInput.value = post.content;
  usernameInput.value = post.username;

  editingPostId = id;
  submitButton.textContent = "Update Entry";
  cancelEditButton.hidden = false;
  clearErrors();
  refreshTextareaSizes();

  form.scrollIntoView({ behavior: "smooth" });
  titleInput.focus();
}

// STEP 8: Load saved posts when the page opens
posts = loadPosts();
renderPosts();