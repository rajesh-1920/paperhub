const REVIEW_DATA = [
  {
    id: "r-1001",
    documentName: "Q1 Compliance Audit Report.pdf",
    submittedBy: "Alyssa Chen",
    submittedDate: "2026-05-27",
    priority: "high",
    status: "pending",
    department: "Compliance",
    reviewer: "Jordan Lee",
    dueDate: "Today",
    pageCount: 24,
    tags: ["Audit", "Urgent"],
    summary: "Quarterly audit evidence pack awaiting signature verification and finance sign-off.",
    checklist: [
      { label: "Signature present on cover sheet", done: false },
      { label: "Budget references verified", done: true },
      { label: "Supporting files attached", done: true },
    ],
    comments: [
      {
        author: "Mina Patel",
        role: "Lead Reviewer",
        date: "2026-05-28",
        text: "Please confirm the reconciliation summary on page 8 before approval.",
      },
    ],
    highlights: [
      "Requires two final approvals",
      "Contains cross-department evidence",
      "Priority escalation due today",
    ],
  },
  {
    id: "r-1002",
    documentName: "Vendor Contract Addendum.pdf",
    submittedBy: "Marcus Reed",
    submittedDate: "2026-05-27",
    priority: "medium",
    status: "in-review",
    department: "Legal",
    reviewer: "Dana Fox",
    dueDate: "Tomorrow",
    pageCount: 14,
    tags: ["Contract", "Legal"],
    summary: "Addendum review for scope updates, service-level changes, and updated payment terms.",
    checklist: [
      { label: "Clauses aligned with base contract", done: true },
      { label: "Escalation path confirmed", done: true },
      { label: "Redlines resolved", done: false },
    ],
    comments: [
      {
        author: "Dana Fox",
        role: "Legal Reviewer",
        date: "2026-05-28",
        text: "Awaiting one last clause clarification from procurement.",
      },
      {
        author: "Marcus Reed",
        role: "Submitted by",
        date: "2026-05-28",
        text: "I’ve attached the updated pricing sheet in the appendix.",
      },
    ],
    highlights: [
      "Legal review in progress",
      "Two redlines still open",
      "Procurement feedback pending",
    ],
  },
  {
    id: "r-1003",
    documentName: "Budget Reforecast FY2026.xlsx",
    submittedBy: "Grace Park",
    submittedDate: "2026-05-26",
    priority: "low",
    status: "completed",
    department: "Finance",
    reviewer: "Ethan Cole",
    dueDate: "Completed",
    pageCount: 11,
    tags: ["Finance", "Completed"],
    summary: "Reforecast workbook approved after variance analysis and executive review.",
    checklist: [
      { label: "Variance notes attached", done: true },
      { label: "Executive approval logged", done: true },
      { label: "Archive copy created", done: true },
    ],
    comments: [
      {
        author: "Ethan Cole",
        role: "Finance Reviewer",
        date: "2026-05-26",
        text: "Looks clear. Archive copy has been stored in the finance vault.",
      },
    ],
    highlights: [
      "Archived after approval",
      "No open blockers",
      "Use as template for next cycle",
    ],
  },
  {
    id: "r-1004",
    documentName: "Student Records Verification.pdf",
    submittedBy: "Nadia Rahman",
    submittedDate: "2026-05-25",
    priority: "high",
    status: "pending",
    department: "Records",
    reviewer: "Olivia King",
    dueDate: "Today",
    pageCount: 31,
    tags: ["Records", "Sensitive"],
    summary: "Identity verification packet for a batch of student records requiring strict validation.",
    checklist: [
      { label: "Identity fields validated", done: true },
      { label: "Reference match confirmed", done: false },
      { label: "Sensitive data redaction reviewed", done: false },
    ],
    comments: [
      {
        author: "Olivia King",
        role: "Records Reviewer",
        date: "2026-05-26",
        text: "Please verify the reference number against the source form.",
      },
    ],
    highlights: [
      "Sensitive review path",
      "Needs reference confirmation",
      "Escalation if mismatch appears",
    ],
  },
  {
    id: "r-1005",
    documentName: "HR Policy Update.pdf",
    submittedBy: "Thomas Nguyen",
    submittedDate: "2026-05-24",
    priority: "medium",
    status: "pending",
    department: "Human Resources",
    reviewer: "Sophia Miller",
    dueDate: "Friday",
    pageCount: 19,
    tags: ["Policy", "HR"],
    summary: "Updated policy language covering flexible working, leave handling, and approval flow changes.",
    checklist: [
      { label: "Policy wording aligned with legal guidance", done: true },
      { label: "FAQ section updated", done: true },
      { label: "Manager communication drafted", done: false },
    ],
    comments: [
      {
        author: "Sophia Miller",
        role: "HR Reviewer",
        date: "2026-05-25",
        text: "The policy is clear, but the communication note still needs a final review.",
      },
    ],
    highlights: [
      "Pending communications review",
      "No policy conflicts detected",
      "Schedule rollout after approval",
    ],
  },
  {
    id: "r-1006",
    documentName: "Procurement Exception Notice.pdf",
    submittedBy: "Daniel Brooks",
    submittedDate: "2026-05-23",
    priority: "high",
    status: "in-review",
    department: "Procurement",
    reviewer: "Maya Johnson",
    dueDate: "Tomorrow",
    pageCount: 9,
    tags: ["Exception", "Supplier"],
    summary: "Exception notice requesting approval to move forward with an alternate supplier.",
    checklist: [
      { label: "Supplier alternative documented", done: true },
      { label: "Risk review complete", done: false },
      { label: "Approver assigned", done: true },
    ],
    comments: [
      {
        author: "Maya Johnson",
        role: "Procurement Reviewer",
        date: "2026-05-24",
        text: "Risk note needs to include expected delivery impact.",
      },
      {
        author: "Daniel Brooks",
        role: "Submitted by",
        date: "2026-05-24",
        text: "I’ve added the alternate supplier timeline to the appendix.",
      },
    ],
    highlights: [
      "High priority approval required",
      "Supplier risk still open",
      "Alternative path documented",
    ],
  },
];

let activeReview = null;
let activeQueueItems = [];
let activeQueueFilter = "all";
let activeQueueSearch = "";

function canManageReview() {
  return typeof hasRole === "function" ? hasRole(["officer", "admin"]) : false;
}

function initReviewQueuePage() {
  activeQueueItems = getReviewData();
  setupReviewQueueInteractions();
  renderReviewQueue();
}

function initReviewDetailsPage() {
  const reviewId = new URLSearchParams(window.location.search).get("id");
  activeReview = getReviewById(reviewId);
  renderReviewDetails(activeReview);
  if (canManageReview()) {
    setupReviewActions();
    setupReviewCommentAction();
  }
}

function getReviewData() {
  return REVIEW_DATA.slice();
}

function getReviewById(reviewId) {
  const reviews = getReviewData();
  return reviews.find((review) => review.id === reviewId) || reviews[0];
}

function setupReviewQueueInteractions() {
  const searchInput = getElement("#reviewSearchInput");
  addEvent(searchInput, "input", () => {
    activeQueueSearch = String(searchInput?.value || "").trim().toLowerCase();
    renderReviewQueue();
  });

  // clear button behavior moved from inline HTML to JS
  const clearBtn = getElement('.search-clear');
  if (clearBtn && searchInput) {
    addEvent(clearBtn, 'click', (e) => {
      e.preventDefault();
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.focus();
    });
  }

  getElements(".filter-btn").forEach((button) => {
    addEvent(button, "click", (event) => {
      event.preventDefault();
      getElements(".filter-btn").forEach((item) => removeClass(item, "active"));
      addClass(button, "active");
      activeQueueFilter = String(button.getAttribute("data-filter") || "all");
      renderReviewQueue();
    });
  });
}

function renderReviewQueue() {
  const reviewTableBody = getElement("#reviewTableBody");
  if (!reviewTableBody) {
    return;
  }

  const filteredReviews = activeQueueItems.filter((review) => {
    const matchesFilter =
      activeQueueFilter === "all" ||
      (activeQueueFilter === "high" && review.priority === "high") ||
      (activeQueueFilter === "pending" && review.status === "pending") ||
      (activeQueueFilter === "in-review" && review.status === "in-review") ||
      (activeQueueFilter === "completed" && review.status === "completed");

    const searchIndex = [
      review.documentName,
      review.submittedBy,
      review.department,
      review.reviewer,
      review.priority,
      review.status,
      review.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !activeQueueSearch || searchIndex.includes(activeQueueSearch);

    return matchesFilter && matchesSearch;
  });

  reviewTableBody.innerHTML = "";

  if (!filteredReviews.length) {
    reviewTableBody.appendChild(createEmptyQueueRow());
  } else {
    const fragment = document.createDocumentFragment();
    filteredReviews.forEach((review) => {
      fragment.appendChild(createReviewRow(review));
    });
    reviewTableBody.appendChild(fragment);
  }

  updateQueueStats(filteredReviews);
  renderQueueInsights(filteredReviews);
  updateVisibleCount(filteredReviews.length);
}

function updateQueueStats(visibleReviews) {
  const reviews = activeQueueItems;
  const pendingCount = reviews.filter((review) => review.status === "pending").length;
  const inReviewCount = reviews.filter((review) => review.status === "in-review").length;
  const highCount = reviews.filter((review) => review.priority === "high").length;
  const completedCount = reviews.filter((review) => review.status === "completed").length;

  updateStatValue("pending", pendingCount);
  updateStatValue("in-review", inReviewCount);
  updateStatValue("high", highCount);
  updateStatValue("completed", completedCount);
  updateVisibleCount(visibleReviews.length);
}

function renderQueueInsights(visibleReviews) {
  const insightGrid = getElement("[data-review-insight-grid]");
  const focusList = getElement("[data-review-focus-list]");

  if (insightGrid) {
    const pendingCount = activeQueueItems.filter((review) => review.status === "pending").length;
    const inReviewCount = activeQueueItems.filter((review) => review.status === "in-review").length;
    const highCount = activeQueueItems.filter((review) => review.priority === "high").length;
    const completedCount = activeQueueItems.filter((review) => review.status === "completed").length;

    insightGrid.innerHTML = `
      <div class="review-insight-card">
        <span>Total items</span>
        <strong>${activeQueueItems.length}</strong>
      </div>
      <div class="review-insight-card">
        <span>Pending</span>
        <strong>${pendingCount}</strong>
      </div>
      <div class="review-insight-card">
        <span>In review</span>
        <strong>${inReviewCount}</strong>
      </div>
      <div class="review-insight-card">
        <span>High priority</span>
        <strong>${highCount}</strong>
      </div>
      <div class="review-insight-card">
        <span>Completed</span>
        <strong>${completedCount}</strong>
      </div>
      <div class="review-insight-card">
        <span>Visible now</span>
        <strong>${visibleReviews.length}</strong>
      </div>
    `;
  }

  if (focusList) {
    const focusItems = getQueueFocusItems(visibleReviews);
    focusList.innerHTML = focusItems
      .map(
        (item) => `
          <li>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </li>
        `,
      )
      .join("");
  }
}

function getQueueFocusItems(visibleReviews) {
  const source = visibleReviews.length > 0 ? visibleReviews : activeQueueItems;
  const sorted = source
    .slice()
    .sort((left, right) => {
      const priorityOrder = getPrioritySortWeight(right.priority) - getPrioritySortWeight(left.priority);
      if (priorityOrder !== 0) {
        return priorityOrder;
      }

      return new Date(left.submittedDate).getTime() - new Date(right.submittedDate).getTime();
    });

  const nextItem = sorted[0];
  const pendingHigh = activeQueueItems.filter(
    (review) => review.priority === "high" && review.status === "pending",
  ).length;
  const inReviewCount = activeQueueItems.filter((review) => review.status === "in-review").length;

  return [
    {
      title: nextItem ? `Prioritize ${nextItem.documentName}` : "No items visible",
      detail: nextItem
        ? `${formatStatusLabel(nextItem.status)} • due ${nextItem.dueDate}`
        : "Clear search or filters to continue reviewing items.",
    },
    {
      title: `${pendingHigh} high-priority pending`,
      detail: "These items should be handled before medium and low priority submissions.",
    },
    {
      title: `${inReviewCount} items in progress`,
      detail: "Follow up on active reviews to keep the queue moving.",
    },
  ];
}

function updateVisibleCount(count) {
  getElements("[data-review-visible-count]").forEach((element) => {
    element.textContent = String(count);
  });
}

function updateStatValue(statKey, value) {
  getElements(`[data-review-stat="${statKey}"]`).forEach((element) => {
    element.textContent = String(value);
  });
}

function createEmptyQueueRow() {
  const row = createElement("tr", "review-empty-row");
  row.innerHTML = `
    <td colspan="7">
      <div class="review-empty-state">
        <strong>No review items match your search</strong>
        <span>Try another keyword or switch to a different filter.</span>
      </div>
    </td>
  `;
  return row;
}

function createReviewRow(review) {
  const row = createElement("tr");
  row.dataset.priority = review.priority;
  row.dataset.status = review.status;

  row.innerHTML = `
    <td>
      <div class="review-doc-cell">
        <span class="review-doc-avatar">${escapeHtml(getInitials(review.submittedBy))}</span>
        <div>
          <a href="review-details.html?id=${encodeURIComponent(review.id)}" data-app-href="pages/review/review-details.html?id=${encodeURIComponent(review.id)}" class="review-link">
            ${escapeHtml(review.documentName)}
          </a>
          <span class="review-doc-subtext">${escapeHtml(review.department)}</span>
        </div>
      </div>
    </td>
    <td>
      <strong>${escapeHtml(review.submittedBy)}</strong>
      <span>${escapeHtml(review.reviewer)}</span>
    </td>
    <td>${formatDate(review.submittedDate)}</td>
    <td><span class="review-pill priority-${review.priority}">${formatPriorityLabel(review.priority)}</span></td>
    <td><span class="review-pill status-${review.status}">${formatStatusLabel(review.status)}</span></td>
    <td>${escapeHtml(review.dueDate)}</td>
    <td>
      <div class="review-actions">
        <a href="review-details.html?id=${encodeURIComponent(review.id)}" data-app-href="pages/review/review-details.html?id=${encodeURIComponent(review.id)}" class="btn btn-sm btn-primary">Review</a>
      </div>
    </td>
  `;

  return row;
}

function renderReviewDetails(review) {
  if (!review) {
    return;
  }

  const privilegedReview = canManageReview();
  const reviewReason = review.reviewReason || review.summary;
  const openChecklistCount = review.checklist.filter((item) => !item.done).length;
  const reviewTrailItems = buildReviewTrailItems(review, openChecklistCount);
  document.title = `${review.documentName} - PaperHub Review`;

  const detailsContainer = getElement("#reviewDetailsContent");
  const heroMetaContainer = getElement("#reviewDetailsHeroMeta");
  const statusLabel = getElement("[data-review-status-label]");
  const accessNote = getElement("[data-review-access-note]");
  const actionBar = getElement("[data-review-action-bar]");

  if (statusLabel) {
    statusLabel.textContent = privilegedReview ? formatStatusLabel(review.status) : "View only";
  }

  if (accessNote) {
    accessNote.textContent = privilegedReview
      ? "Document ready for decision"
      : "View-only access for this file.";
  }

  if (actionBar) {
    actionBar.classList.toggle("hidden", !privilegedReview);
  }

  if (heroMetaContainer) {
    heroMetaContainer.innerHTML = `
      <div class="review-hero-summary-grid">
        <div class="review-hero-summary-card">
          <span>File type</span>
          <strong>${escapeHtml(getDocumentType(review.documentName))}</strong>
        </div>
        <div class="review-hero-summary-card">
          <span>Reviewer</span>
          <strong>${escapeHtml(review.reviewer)}</strong>
        </div>
        <div class="review-hero-summary-card">
          <span>Due</span>
          <strong>${escapeHtml(review.dueDate)}</strong>
        </div>
        <div class="review-hero-summary-card">
          <span>Pages</span>
          <strong>${escapeHtml(String(review.pageCount))}</strong>
        </div>
      </div>
      <div class="review-hero-summary-strip">
        <span class="review-pill priority-${review.priority}">${formatPriorityLabel(review.priority)}</span>
        <span class="review-pill status-${review.status}">${formatStatusLabel(review.status)}</span>
        <span class="review-hero-summary-note">${escapeHtml(review.department)} submission · ${escapeHtml(String(review.comments.length))} comments · ${escapeHtml(String(openChecklistCount))} open checks</span>
      </div>
    `;
  }

  if (detailsContainer) {
    const notesSection = privilegedReview
      ? `
      <section class="review-side-panel card">
        <div class="review-section-head">
          <div>
            <h3>Discussion</h3>
            <p>Comment history and follow-up notes for the reviewer.</p>
          </div>
        </div>
        <div class="comments-list review-comment-list">
          ${review.comments
        .map(
          (comment) => `
                <div class="comment-item review-comment-item">
                  <div class="comment-header">
                    <div>
                      <strong>${escapeHtml(comment.author)}</strong>
                      <span>${escapeHtml(comment.role)}</span>
                    </div>
                    <span class="comment-date">${formatDate(comment.date)}</span>
                  </div>
                  <p>${escapeHtml(comment.text)}</p>
                </div>
              `,
        )
        .join("")}
        </div>

        <div class="comment-form">
          <label class="sr-only" for="reviewComment">Add a review comment</label>
          <textarea id="reviewComment" placeholder="Add your comment..." class="form-control" rows="4"></textarea>
          <button id="addReviewCommentBtn" type="button" class="btn btn-primary btn-sm">Add Comment</button>
        </div>
      </section>
    `
      : `
      <section class="review-side-panel card review-readonly-panel">
        <div class="review-section-head">
          <div>
            <h3>Read-only overview</h3>
            <p>This page shows the file, the review state, and the reason it is being checked.</p>
          </div>
        </div>
        <div class="review-readonly-card">
          <strong>Review access restricted</strong>
          <p>Only officer and admin accounts can approve, reject, or forward documents.</p>
        </div>
      </section>
    `;

    detailsContainer.innerHTML = `
      <div class="review-detail-layout">
        <section class="review-detail-panel card">
          <div class="review-detail-panel-head">
            <div class="review-doc-cell review-doc-cell-large">
              <span class="review-doc-avatar">${escapeHtml(getInitials(review.submittedBy))}</span>
              <div>
                <span class="review-doc-kicker">${escapeHtml(review.department)} · ${escapeHtml(getDocumentType(review.documentName))}</span>
                <h2>${escapeHtml(review.documentName)}</h2>
                <p>Submitted by <strong>${escapeHtml(review.submittedBy)}</strong> on ${formatDate(review.submittedDate)}</p>
              </div>
            </div>
            <div class="review-status-stack">
              <span class="review-pill priority-${review.priority}">${formatPriorityLabel(review.priority)}</span>
              <span class="review-pill status-${review.status}">${formatStatusLabel(review.status)}</span>
            </div>
          </div>

          <div class="review-summary-grid">
            <div class="review-summary-card">
              <span>Reviewer</span>
              <strong>${escapeHtml(review.reviewer)}</strong>
            </div>
            <div class="review-summary-card">
              <span>Due</span>
              <strong>${escapeHtml(review.dueDate)}</strong>
            </div>
            <div class="review-summary-card">
              <span>Pages</span>
              <strong>${escapeHtml(String(review.pageCount))}</strong>
            </div>
            <div class="review-summary-card">
              <span>Comments</span>
              <strong>${escapeHtml(String(review.comments.length))}</strong>
            </div>
          </div>

          <div class="review-document-preview">
            <div class="review-document-frame">
              <div class="review-document-frame-top">
                <span>File snapshot</span>
                <strong>${escapeHtml(review.pageCount)} pages</strong>
              </div>
              <div class="review-document-page">
                <div class="review-document-heading">${escapeHtml(review.documentName)}</div>
                <div class="review-document-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div class="review-document-callout">
                  <strong>Why this is under review</strong>
                  <p>${escapeHtml(reviewReason)}</p>
                </div>
              </div>
            </div>
          </div>

          <section class="review-side-panel card review-embedded-panel">
            <div class="review-section-head">
              <div>
                <h3>What is being checked</h3>
                <p>Open items, evidence, and the points that drove the review.</p>
              </div>
            </div>
            <div class="review-tag-list">
              ${review.tags
        .map((tag) => `<span class="review-tag">${escapeHtml(tag)}</span>`)
        .join("")}
            </div>
            <div class="review-highlight-list">
              ${review.highlights
        .map(
          (item) => `
                <div class="review-highlight-item">
                  <span class="review-highlight-dot"></span>
                  <span>${escapeHtml(item)}</span>
                </div>
              `,
        )
        .join("")}
            </div>
            <ul class="review-checklist">
              ${review.checklist
        .map(
          (item) => `
                <li class="${item.done ? "is-done" : "is-open"}">
                  <span></span>
                  <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <p>${item.done ? "Verified" : "Needs attention"}</p>
                  </div>
                </li>
              `,
        )
        .join("")}
            </ul>
          </section>
        </section>

        <aside class="review-detail-sidebar">
          <section class="review-side-panel card">
            <div class="review-section-head">
              <div>
                <h3>Review status</h3>
                <p>Assignment, urgency, and the current file state.</p>
              </div>
            </div>
            <div class="review-status-banner">
              <span class="review-pill priority-${review.priority}">${formatPriorityLabel(review.priority)}</span>
              <span class="review-pill status-${review.status}">${formatStatusLabel(review.status)}</span>
              <p>${escapeHtml(reviewReason)}</p>
            </div>
            <div class="review-insight-grid">
              <div class="review-insight-card">
                <span>Reviewer</span>
                <strong>${escapeHtml(review.reviewer)}</strong>
              </div>
              <div class="review-insight-card">
                <span>Priority</span>
                <strong>${formatPriorityLabel(review.priority)}</strong>
              </div>
              <div class="review-insight-card">
                <span>Due</span>
                <strong>${escapeHtml(review.dueDate)}</strong>
              </div>
              <div class="review-insight-card">
                <span>Open checks</span>
                <strong>${escapeHtml(String(openChecklistCount))}</strong>
              </div>
            </div>
          </section>

          <section class="review-side-panel card">
            <div class="review-section-head">
              <div>
                <h3>Review trail</h3>
                <p>How the file moved into this state.</p>
              </div>
            </div>
            <div class="review-trail">
              ${reviewTrailItems
        .map(
          (item, index) => `
                <div class="review-trail-item">
                  <span>${escapeHtml(String(index + 1))}</span>
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.detail)}</p>
                  </div>
                </div>
              `,
        )
        .join("")}
            </div>
          </section>

          ${notesSection}
        </aside>
      </div>
    `;
  }

}

function buildReviewTrailItems(review, openChecklistCount) {
  const commentsCount = review.comments.length;
  const latestComment = review.comments[review.comments.length - 1];

  return [
    {
      title: "Submitted",
      detail: `${review.submittedBy} uploaded the file on ${formatDate(review.submittedDate)} for ${review.department.toLowerCase()} review.`,
    },
    {
      title: "Reason for review",
      detail: review.summary,
    },
    {
      title: "Assigned reviewer",
      detail: `${review.reviewer} is currently responsible for the ${formatStatusLabel(review.status).toLowerCase()} decision.`,
    },
    {
      title: "Open follow-up",
      detail: `${openChecklistCount} checklist item${openChecklistCount === 1 ? "" : "s"} remain open and ${commentsCount} comment${commentsCount === 1 ? "" : "s"} have been added.${latestComment ? ` Latest note from ${latestComment.author}.` : ""}`,
    },
  ];
}

function getDocumentType(documentName) {
  const name = String(documentName || "");
  const extension = name.includes(".") ? name.split(".").pop() : "";

  if (!extension) {
    return "File";
  }

  return extension.toUpperCase();
}

function setupReviewActions() {
  const approveBtn = getElement("#approveBtn");
  const rejectBtn = getElement("#rejectBtn");
  const forwardBtn = getElement("#forwardBtn");

  addEvent(approveBtn, "click", () => handleReviewAction("approved"));
  addEvent(rejectBtn, "click", () => handleReviewAction("rejected"));
  addEvent(forwardBtn, "click", () => handleReviewAction("forwarded"));
}

function setupReviewCommentAction() {
  const commentButton = getElement("#addReviewCommentBtn");
  addEvent(commentButton, "click", addComment);
}

function handleReviewAction(action) {
  const comment = getElement("#reviewComment")?.value || "";

  if (!comment && (action === "rejected" || action === "forwarded")) {
    showError("Please add a comment");
    return;
  }

  const reviewName = activeReview ? activeReview.documentName : "this document";
  const confirmationMessage = `Are you sure you want to ${action} ${reviewName}?${comment ? ` Comment: ${comment.trim()}` : ""}`;

  if (!confirm(confirmationMessage)) {
    return;
  }

  showSuccess(`Document ${action} successfully`);

  setTimeout(() => {
    window.location.href = typeof resolveAppPath === "function"
      ? resolveAppPath("pages/review/review-queue.html")
      : "review-queue.html";
  }, 900);
}

function addComment() {
  const commentInput = getElement("#reviewComment");
  const commentText = commentInput?.value?.trim();

  if (!commentText) {
    showError("Please enter a comment");
    return;
  }

  const commentsList = getElement(".review-comment-list");
  if (!commentsList) {
    return;
  }

  const comment = {
    author: "You",
    role: "Current reviewer",
    date: new Date().toISOString(),
    text: commentText,
  };

  if (activeReview) {
    activeReview.comments.push(comment);
  }

  const commentCard = createElement("div", "comment-item review-comment-item animate-slide-in-up");
  commentCard.innerHTML = `
    <div class="comment-header">
      <div>
        <strong>${escapeHtml(comment.author)}</strong>
        <span>${escapeHtml(comment.role)}</span>
      </div>
      <span class="comment-date">Just now</span>
    </div>
    <p>${escapeHtml(comment.text)}</p>
  `;

  commentsList.appendChild(commentCard);
  commentInput.value = "";
  showSuccess("Comment added");
}

function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function formatPriorityLabel(priority) {
  return String(priority || "").charAt(0).toUpperCase() + String(priority || "").slice(1);
}

function formatStatusLabel(status) {
  if (status === "in-review") {
    return "In Review";
  }

  return String(status || "").charAt(0).toUpperCase() + String(status || "").slice(1);
}

function getPrioritySortWeight(priority) {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("review-queue-page")) {
    initReviewQueuePage();
  } else if (document.body.classList.contains("review-details-page")) {
    initReviewDetailsPage();
  }
});
