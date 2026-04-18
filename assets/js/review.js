const MOCK_REVIEWS = [
  {
    id: "1",
    documentName: "Q4 Financial Report.pdf",
    submittedBy: "Alice Johnson",
    submittedDate: "2024-04-06",
    priority: "high",
    status: "pending",
  },
  {
    id: "2",
    documentName: "Annual Summary.pdf",
    submittedBy: "Bob Smith",
    submittedDate: "2024-04-05",
    priority: "medium",
    status: "in-review",
  },
  {
    id: "3",
    documentName: "Budget Analysis.pdf",
    submittedBy: "Charlie Brown",
    submittedDate: "2024-04-04",
    priority: "low",
    status: "pending",
  },
];

const PRIORITY_BADGE_COLOR = {
  high: "danger",
  medium: "warning",
  low: "info",
};

const STATUS_BADGE_COLOR = {
  pending: "warning",
  "in-review": "info",
  completed: "success",
};

function initReviewQueuePage() {
  loadReviewQueue();
  setupReviewFilters();
}

async function loadReviewQueue() {
  const reviewTableBody = getElement("#reviewTableBody");
  if (!reviewTableBody) return;

  try {
    reviewTableBody.innerHTML = "";

    const fragment = document.createDocumentFragment();

    MOCK_REVIEWS.forEach((review) => {
      fragment.appendChild(createReviewRow(review));
    });

    reviewTableBody.appendChild(fragment);

    showSuccess(`Loaded ${MOCK_REVIEWS.length} items for review`);
  } catch (error) {
    console.error("Error loading review queue:", error);
    showError("Failed to load review queue");
  }
}

function setupReviewFilters() {
  const filterBtns = getElements(".filter-btn");

  filterBtns.forEach((btn) => {
    addEvent(btn, "click", (e) => {
      e.preventDefault();

      filterBtns.forEach((b) => removeClass(b, "active"));

      addClass(btn, "active");

      const filter = btn.getAttribute("data-filter");
      filterReviews(filter);
    });
  });
}

function filterReviews(filter) {
  const reviewTableBody = getElement("#reviewTableBody");
  if (!reviewTableBody) return;

  const rows = reviewTableBody.querySelectorAll("tr");

  rows.forEach((row) => {
    const priority = row.dataset.priority;
    const status = row.dataset.status;
    const show =
      filter === "all" ||
      (filter === "high" && priority === "high") ||
      (filter === "pending" && status === "pending") ||
      (filter === "in-review" && status === "in-review");

    show ? showElement(row) : hideElement(row);
  });
}

function initReviewDetailsPage() {
  loadReviewDetails();
  setupReviewActions();
}

async function loadReviewDetails() {
  const params = new URLSearchParams(window.location.search);
  const reviewId = params.get("id");

  if (!reviewId) {
    showError("Review ID not provided");
    return;
  }

  try {
    const reviewDetails = {
      id: reviewId,
      documentName: "Q4 Financial Report.pdf",
      documentUrl: "#",
      submittedBy: "Alice Johnson",
      submittedDate: "2024-04-06",
      priority: "high",
      status: "pending",
      description: "Financial report for Q4 2024 including revenue, expenses, and profit analysis.",
      comments: [
        {
          author: "John Reviewer",
          text: "Please check the calculations on page 3.",
          date: "2024-04-07",
        },
      ],
    };

    const detailsContainer = getElement("#reviewDetailsContent");
    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="review-details-header">
          <div>
            <h2>${escapeHtml(reviewDetails.documentName)}</h2>
            <p class="text-muted">
              Submitted by <strong>${escapeHtml(reviewDetails.submittedBy)}</strong> on ${formatDate(reviewDetails.submittedDate)}
            </p>
          </div>
          <div class="header-badge">
            <span class="badge badge-${reviewDetails.priority === "high" ? "danger" : "warning"}">
              ${reviewDetails.priority.toUpperCase()}
            </span>
          </div>
        </div>

        <div class="review-details-section">
          <h3>Document Preview</h3>
          <div class="document-preview">
            <iframe src="${reviewDetails.documentUrl}" style="width: 100%; height: 500px;"></iframe>
          </div>
        </div>

        <div class="review-details-section">
          <h3>Description</h3>
          <p>${escapeHtml(reviewDetails.description)}</p>
        </div>

        <div class="review-details-section">
          <h3>Comments</h3>
          <div class="comments-list">
            ${reviewDetails.comments
              .map(
                (comment) => `
              <div class="comment-item">
                <div class="comment-header">
                  <strong>${escapeHtml(comment.author)}</strong>
                  <span class="comment-date">${formatDate(comment.date)}</span>
                </div>
                <p>${escapeHtml(comment.text)}</p>
              </div>
            `,
              )
              .join("")}
          </div>

          <div class="comment-form">
            <textarea id="reviewComment" placeholder="Add your comment..." class="form-control"></textarea>
            <button class="btn btn-primary btn-sm mt-md" onclick="addComment()">Add Comment</button>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading review details:", error);
    showError("Failed to load review details");
  }
}

function setupReviewActions() {
  const approveBtn = getElement("#approveBtn");
  const rejectBtn = getElement("#rejectBtn");
  const forwardBtn = getElement("#forwardBtn");

  addEvent(approveBtn, "click", () => handleReviewAction("approved"));
  addEvent(rejectBtn, "click", () => handleReviewAction("rejected"));
  addEvent(forwardBtn, "click", () => handleReviewAction("forwarded"));
}

function handleReviewAction(action) {
  const comment = getElement("#reviewComment")?.value || "";

  if (!comment && (action === "rejected" || action === "forwarded")) {
    showError("Please add a comment");
    return;
  }

  if (
    confirm(
      `Are you sure you want to ${action} this document? ${comment ? `Comment: ${comment.trim()}` : ""}`,
    )
  ) {
    setTimeout(() => {
      showSuccess(`Document ${action} successfully`);
      setTimeout(() => {
        window.history.back();
      }, 1000);
    }, 500);
  }
}

function addComment() {
  const commentInput = getElement("#reviewComment");
  const commentText = commentInput?.value?.trim();

  if (!commentText) {
    showError("Please enter a comment");
    return;
  }

  const commentsList = getElement(".comments-list");
  if (!commentsList) {
    return;
  }

  const newComment = createElement("div", "comment-item animate-slide-in-up");
  const header = createElement("div", "comment-header");
  const author = createElement("strong");
  const date = createElement("span", "comment-date");
  const body = createElement("p");

  author.textContent = "You";
  date.textContent = "Just now";
  body.textContent = commentText;

  header.appendChild(author);
  header.appendChild(date);
  newComment.appendChild(header);
  newComment.appendChild(body);

  commentsList.appendChild(newComment);
  commentInput.value = "";
  showSuccess("Comment added");
}

function createReviewRow(review) {
  const row = createElement("tr");
  row.dataset.priority = review.priority;
  row.dataset.status = review.status;

  row.innerHTML = `
    <td>
      <input type="checkbox" class="review-checkbox" value="${escapeHtml(review.id)}">
    </td>
    <td>
      <a href="/pages/review/review-details.html?id=${encodeURIComponent(review.id)}" class="review-link">
        ${escapeHtml(review.documentName)}
      </a>
    </td>
    <td>${escapeHtml(review.submittedBy)}</td>
    <td>${formatDate(review.submittedDate)}</td>
    <td>
      <span class="badge badge-${PRIORITY_BADGE_COLOR[review.priority] || "info"}">
        ${toTitleCase(review.priority)}
      </span>
    </td>
    <td>
      <span class="badge badge-${STATUS_BADGE_COLOR[review.status] || "info"}">
        ${review.status === "in-review" ? "In Review" : toTitleCase(review.status)}
      </span>
    </td>
    <td>
      <div class="review-actions">
        <a href="/pages/review/review-details.html?id=${encodeURIComponent(review.id)}" class="btn btn-sm btn-primary">Review</a>
      </div>
    </td>
  `;

  return row;
}

function toTitleCase(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("review-queue-page")) {
    initReviewQueuePage();
  } else if (document.body.classList.contains("review-details-page")) {
    initReviewDetailsPage();
  }
});
