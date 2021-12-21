# Canvas LMS Assignments Bulk Assign To Plug-in

[![](https://img.shields.io/npm/v/@artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin.svg)](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin)
[![](https://img.shields.io/github/license/artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin.svg)](https://spdx.org/licenses/ISC)
[![](https://img.shields.io/npm/dt/@artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin.svg)](https://www.npmjs.com/package/@artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin)

Plugin for the [Canvas LMS theme app](https://github.com/artevelde-uas/canvas-lms-app) that
adds an option to bulk assign users to an assignment.

![Example image](docs/example.png)

## Installation

Using NPM:

    npm install @artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin

Using Yarn:

    yarn add @artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin

## Usage

Just import the plug-in and add it to the Canvas app:

```javascript
import { run, addPlugin } from '@artevelde-uas/canvas-lms-app';
import assignmentBulkOverridesPlugin from '@artevelde-uas/canvas-lms-assignments-bulk-assign-to-plugin';

addPlugin(assignmentBulkOverridesPlugin);

run();
```
