/**
 * PaperHub - Review Module
 * Handles document review workflow
 */

/**
 * Initialize review queue page
 */
function initReviewQueuePage() {
  loadReviewQueue();
  setupReviewFilters();
}

/**
 * Load review queue
 */
async function loadReviewQueue() {
  const reviewTableBody = getElement("#reviewTableBody");
  if (!reviewTableBody) return;

  try {
    // Mock API call
    const mockReviews = [
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

    mockReviews.forEach((review) => {
      const row = createElement("tr");
      const priorityBadgeColor = {
        high: "danger",
        medium: "warning",
        low: "info",
      };
      const statusBadgeColor = {
        pending: "warning",
        "in-review": "info",
        completed: "success",
      };

      row.innerHTML = `
        <td>
          <input type="checkbox" class="review-checkbox" value="${review.id}">
        </td>
        <td>
          <a href="/pages/review/review-details.html?id=${review.id}" class="review-link">
            ${review.documentName}
          </a>
        </td>
        <td>${review.submittedBy}</td>
        <td>${formatDate(review.submittedDate)}</td>
        <td>
          <span class="badge badge-${priorityBadgeColor[review.priority]}">
            ${review.priority.charAt(0).toUpperCase() + review.priority.slice(1)}
          </span>
        </td>
        <td>
          <span class="badge badge-${statusBadgeColor[review.status]}">
            ${review.status === "in-review" ? "In Review" : review.status.charAt(0).toUpperCase() + review.status.slice(1)}
          </span>
        </td>
        <td>
          <div class="review-actions">
            <a href="/pages/review/review-details.html?id=${review.id}" class="btn btn-sm btn-primary">Review</a>
          </div>
        </td>
      `;
      reviewTableBody.appendChild(row);
    });

    showSuccess(`Loaded ${mockReviews.length} items for review`);
  } catch (error) {
    console.error("Error loading review queue:", error);
    showError("Failed to load review queue");
  }
}

/**
 * Setup review filters
 */
function setupReviewFilters() {
  const filterBtns = getElements(".filter-btn");

  filterBtns.forEach((btn) => {
    addEvent(btn, "click", (e) => {
      e.preventDefault();

      // Remove active class from all buttons
      filterBtns.forEach((b) => removeClass(b, "active"));

      // Add active class to clicked button
      addClass(btn, "active");

      const filter = btn.getAttribute("data-filter");
      filterReviews(filter);
    });
  });
}

/**
 * Filter reviews
 */
function filterReviews(filter) {
  const reviewTableBody = getElement("#reviewTableBody");
  const rows = reviewTableBody.querySelectorAll("tr");

  rows.forEach((row) => {
    let show = true;

    if (filter === "high") {
      show = row.textContent.includes("High");
    } else if (filter === "pending") {
      show = row.textContent.includes("Pending");
    } else if (filter === "in-review") {
      show = row.textContent.includes("In Review");
    }

    show ? showElement(row) : hideElement(row);
  });
}

/**
 * Initialize review details page
 */
function initReviewDetailsPage() {
  loadReviewDetails();
  setupReviewActions();
}

/**
 * Load review details
 */
async function loadReviewDetails() {
  const params = new URLSearchParams(window.location.search);
  const reviewId = params.get("id");

  if (!reviewId) {
    showError("Review ID not provided");
    return;
  }

  try {
    // Mock review details
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

    // Populate review details
    const detailsContainer = getElement("#reviewDetailsContent");
    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="review-details-header">
          <div>
            <h2>${reviewDetails.documentName}</h2>
            <p class="text-muted">
              Submitted by <strong>${reviewDetails.submittedBy}</strong> on ${formatDate(reviewDetails.submittedDate)}
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
          <p>${reviewDetails.description}</p>
        </div>

        <div class="review-details-section">
          <h3>Comments</h3>
          <div class="comments-list">
            ${reviewDetails.comments
              .map(
                (comment) => `
              <div class="comment-item">
                <div class="comment-header">
                  <strong>${comment.author}</strong>
                  <span class="comment-date">${formatDate(comment.date)}</span>
                </div>
                <p>${comment.text}</p>
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

/**
 * Setup review action buttons
 */
function setupReviewActions() {
  const approveBtn = getElement("#approveBtn");
  const rejectBtn = getElement("#rejectBtn");
  const forwardBtn = getElement("#forwardBtn");

  if (approveBtn) {
    addEvent(approveBtn, "click", () => handleReviewAction("approved"));
  }

  if (rejectBtn) {
    addEvent(rejectBtn, "click", () => handleReviewAction("rejected"));
  }

  if (forwardBtn) {
    addEvent(forwardBtn, "click", () => handleReviewAction("forwarded"));
  }
}

/**
 * Handle review action
 */
function handleReviewAction(action) {
  const comment = getElement("#reviewComment")?.value || "";

  if (!comment && (action === "rejected" || action === "forwarded")) {
    showError("Please add a comment");
    return;
  }

  if (
    confirm(
      `Are you sure you want to ${action} this document? ${comment ? `Comment: ${comment}` : ""}`,
    )
  ) {
    // Mock API call
    setTimeout(() => {
      showSuccess(`Document ${action} successfully`);
      setTimeout(() => {
        window.history.back();
      }, 1000);
    }, 500);
  }
}

/**
 * Add comment
 */
function addComment() {
  const commentText = getElement("#reviewComment")?.value;

  if (!commentText) {
    showError("Please enter a comment");
    return;
  }

  const commentsList = getElement(".comments-list");
  const newComment = createElement("div", "comment-item animate-slide-in-up");
  newComment.innerHTML = `
    <div class="comment-header">
      <strong>You</strong>
      <span class="comment-date">Just now</span>
    </div>
    <p>${commentText}</p>
  `;

  commentsList.appendChild(newComment);
  getElement("#reviewComment").value = "";
  showSuccess("Comment added");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("review-queue-page")) {
    initReviewQueuePage();
  } else if (document.body.classList.contains("review-details-page")) {
    initReviewDetailsPage();
  }
});
