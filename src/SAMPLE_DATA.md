# Sample Data Setup Guide

## Quick Start

1. Open the application
2. On the login screen, click the "Setup Sample Data" button
3. Click "Create Sample Data" on the setup page
4. Use the credentials shown to log in

## Sample Accounts Created

### Manager Account
- **Name:** Sarah Johnson
- **Email:** manager@example.com
- **Password:** manager123
- **Role:** Manager

### Consultant Accounts

#### Consultant 1
- **Name:** John Smith
- **Email:** consultant1@example.com
- **Password:** consultant123
- **Role:** Consultant

#### Consultant 2
- **Name:** Emily Davis
- **Email:** consultant2@example.com
- **Password:** consultant123
- **Role:** Consultant

## Sample Projects Created

### Project 1: Digital Transformation Initiative
- **Description:** Enterprise-wide digital transformation project for a Fortune 500 client
- **Manager:** Sarah Johnson
- **Assigned Consultants:** John Smith, Emily Davis

### Project 2: Cloud Migration Project
- **Description:** Migration of legacy systems to AWS cloud infrastructure
- **Manager:** Sarah Johnson
- **Assigned Consultants:** John Smith

## How to Test the System

### As a Consultant (John Smith or Emily Davis)

1. Log in with a consultant account
2. Submit an expense:
   - Select a project you're assigned to
   - Enter amount and description
   - Upload a receipt file (any image file)
   - Submit for approval
3. Submit mileage:
   - Select a project
   - Enter start location (e.g., "Home")
   - Enter end location (e.g., "Client Office")
   - Enter distance in miles
   - Submit for approval
4. View your submissions and their approval status

### As a Manager (Sarah Johnson)

1. Log in with the manager account
2. View all pending expenses and mileage submissions from assigned consultants
3. Review each submission
4. Approve or reject submissions
5. Assign additional consultants to projects
6. Create new projects

## Features to Test

- ✅ Role-based authentication
- ✅ File upload for receipts
- ✅ Project assignment
- ✅ Expense approval workflow
- ✅ Mileage tracking and approval
- ✅ Dashboard views for different roles
- ✅ Real-time status updates

## Note

The sample data setup is idempotent - you can run it multiple times without creating duplicates. If accounts already exist, they will be skipped.
