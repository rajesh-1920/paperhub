# PaperHub

**Secure Digital Document and File Management Platform**

## Overview

PaperHub is a modern web-based system that helps institutions manage documents, applications, and enrollment processes digitally. Instead of dealing with physical files and slow manual processes, PaperHub provides a secure, transparent, and efficient platform where documents can be uploaded, reviewed, approved, and processed all in one place.

This system is especially useful for institutions that handle large numbers of admission-related documents and need to track every step of the process.

## The Problem We're Solving

Traditional document handling in institutions has real challenges:

- **No clear tracking** - You can't easily see where a document is or what stage it's at
- **No version control** - Multiple versions of the same document cause confusion
- **Lack of accountability** - It's hard to trace who did what and when
- **Financial risks** - Money might be collected before documents are properly verified

PaperHub fixes all of these issues with a structured digital system.

## Key Features

✓ **Digital Document Management** - Upload and store PDF/DOC files with complete version history  
✓ **Multi-Level Reviews** - Documents go through multiple approval stages for security  
✓ **Role-Based Access** - Different users (Admin, Officers, Applicants) have different permissions  
✓ **Payment Protection** - Payments only happen after documents are pre-approved  
✓ **Complete Audit Trail** - Every action is logged with timestamps for full transparency  
✓ **Admin Dashboard** - Detailed reports and monitoring tools for administrators

## How It Works

The system follows a simple, secure workflow:

1. **Draft** - Applicant prepares and uploads their document
2. **Submit** - Document enters the review queue
3. **Review** - Officer verifies the document authenticity
4. **Pre-Approval** - Decision is recorded in the system
5. **Payment** - Payment option becomes available (only at this stage)
6. **Final Enrollment** - After payment, the application is finalized

## Who Uses PaperHub?

**Admins** - Manage users, create departments, and monitor system activity  
**Officers/Reviewers** - Verify documents and make approval or rejection decisions  
**Applicants/Users** - Submit documents, track progress, and complete payments

## Technology Stack

| Component         | Technology                                                    |
| ----------------- | ------------------------------------------------------------- |
| Frontend          | React.js (Single Page Application) with HTML, CSS, JavaScript |
| Backend           | Node.js & Express.js with RESTful APIs                        |
| Document Database | MongoDB (for applications and metadata)                       |
| Finance Database  | MS SQL Server (for payments and audit logs)                   |
| Security          | JWT Authentication & Role-Based Access Control (RBAC)         |

## Getting Started

### Prerequisites

- Node.js and npm installed
- MongoDB running
- MS SQL Server configured

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with your database credentials and API keys

# Start the application
npm start
```

## Project Goals

- Create a fully digital workflow for document processing
- Ensure complete security with role-based access control
- Implement thorough document review processes
- Protect institutional finances with secure payment handling
- Maintain complete transparency through detailed audit logs

## Development Status

| Week   | Objective                      | Status |
| ------ | ------------------------------ | ------ |
| Week 1 | Project proposal & UI Mockups  | -      |
| Week 2 | Environment setup & Navigation | -      |
| Week 3 | Auth integration & Basic UI    | -      |
| Week 4 | DB Schema & Drizzle ORM setup  | -      |

## Why This Project Matters

PaperHub demonstrates real-world software development skills:

- Building secure systems that handle sensitive data
- Creating role-based access control for different user types
- Managing complex business workflows
- Handling payment processing securely
- Maintaining audit trails for compliance

This project is valuable for anyone interested in enterprise software development, fintech solutions, or institutional management systems.

## License

This project is part of CIT 320 - Software Development Project-II at Patuakhali Science and Technology University.

---

**Submitted by:** Rajesh Biswas (ID: 2002060)  
**Semester:** 6 (Level-3, Semester-11)
