import { router, dom, api } from '@artevelde-uas/canvas-lms-app';
import __ from './i18n';

import styles from './index.module.css';


export default function () {
    router.onRoute(['courses.assignments.new', 'courses.assignments.edit'], async (params, routeName) => {
        const saveButton = await dom.onElementReady('.assignment__action-buttons button[type="submit"].btn-primary');
        const savePublishButton = await dom.onElementReady('.assignment__action-buttons button.save_and_publish');

        [saveButton, savePublishButton].forEach(element => {
            element.addEventListener('click', event => {
                const isBulkAssignment = document.getElementById(styles.bulkAssignment).checked;

                // Stop if not in bulk assignment mode
                if (!isBulkAssignment) return;

                const rows = document.querySelectorAll('.Container__DueDateRow-item');

                // Check if user list is valid
                const isValid = Array.from(rows).every(row => {
                    const invalidItems = row.querySelectorAll(`.${styles.bulkInputWrapper} > textarea + div > .${styles.invalid}`);

                    return (invalidItems.length === 0);
                });

                // Stop default behavior if user list is invalid
                if (!isValid) {
                    event.preventDefault();
                    event.stopPropagation();

                    alert(__('invalid_users_message'));

                    return;
                }

                // Delete all current tokens
                rows.forEach(row => {
                    const tokenDeleteButton = row.querySelector('.ic-token-delete-button');

                    while (tokenDeleteButton !== null) {
                        tokenDeleteButton.click();
                        tokenDeleteButton = row.querySelector('.ic-token-delete-button');
                    }
                });

                // Add at least one student per row to prevent validator issues
                rows.forEach((row, key) => {
                    // Add 'Everyone else' to the first row to prevent warning
                    if (key === 0) {
                        const option = row.querySelector('.ic-tokeninput-list > .ic-tokeninput-header[value="course_section"] + .ic-tokeninput-option');

                        option.click();
                    }

                    const option = row.querySelector('.ic-tokeninput-list > .ic-tokeninput-header[value="student"] + .ic-tokeninput-option');

                    option.click();
                });

            }, { useCapture: true });
        });

        // Add a 'Bulk assignment' checkbox before 'Assign to' blocks
        dom.onElementAdded('.overrides-column-right', overridesColumnRight => {
            overridesColumnRight.insertAdjacentHTML('beforebegin', `
                <div class="form-column-right ${styles.bulkOverridesRow}">
                    <div class="border border-trbl border-round">
                        <label class="checkbox flush">
                            <input type="checkbox" id="${styles.bulkAssignment}" />
                            ${__('bulk_assignment')}
                        </label>
                    </div>
                </div>
                <div></div>
                <div class="form-column-left"></div>
            `);

            const bulkAssignment = document.getElementById(styles.bulkAssignment);

            // Set 'bulk' class to container reflecting checkbox state
            bulkAssignment.addEventListener('change', event => {
                overridesColumnRight.classList.toggle(styles.bulk, event.target.checked);
            });
        }, { once: true });

        // Get the currently enrolled students from the course
        const courseStudents = await api.get(`/courses/${params.courseId}/users`, {
            per_page: 100,
            enrollment_type: 'student'
        });

        // Add a text field to newly created due date block
        dom.onElementAdded('.Container__DueDateRow-item', dueDateRow => {
            const icTokens = dueDateRow.querySelector('#assign-to-label + div');

            // Render the textarea and background element
            icTokens.insertAdjacentHTML('afterend', `
                <div class="${styles.bulkInputWrapper}">
                    <textarea></textarea>
                    <div></div>
                </div>
            `);

            /**
             * Gets the element's top offset
             * 
             * @param {HTMLElement} element The element
             * @returns {number} The element's top offset in pixels
             */
            function getTop(element) {
                const elementStyles = getComputedStyle(element);
                const paddingTop = Number.parseInt(elementStyles.paddingTop);
                const borderTopWidth = Number.parseInt(elementStyles.borderTopWidth);

                return (paddingTop + borderTopWidth) - element.scrollTop;
            }

            /**
             * Gets the element's left offset
             * 
             * @param {HTMLElement} element The element
             * @returns {number} The element's left offset in pixels
             */
            function getLeft(element) {
                const elementStyles = getComputedStyle(element);
                const paddingLeft = Number.parseInt(elementStyles.paddingLeft);
                const borderLeftWidth = Number.parseInt(elementStyles.borderLeftWidth);

                return paddingLeft + borderLeftWidth;
            }

            /**
             * Gets the element's inner width
             * 
             * @param {HTMLElement} element The element
             * @returns {number} The element's inner width in pixels
             */
            function getWidth(element) {
                const elementStyles = getComputedStyle(element);
                const paddingLeft = Number.parseInt(elementStyles.paddingLeft);
                const paddingRight = Number.parseInt(elementStyles.paddingRight);

                return element.clientWidth - (paddingLeft + paddingRight);
            }

            // Get references to the textarea and background element
            const bulkInputWrapper = dueDateRow.querySelector(`.${styles.bulkInputWrapper}`);
            const bulkInput = bulkInputWrapper.querySelector(`textarea`);
            const bulkInputBackground = bulkInputWrapper.querySelector(`textarea + div`);

            // Set the correct dimensions to the background element
            bulkInputBackground.style.top = `${getTop(bulkInput)}px`;
            bulkInputBackground.style.left = `${getLeft(bulkInput)}px`;
            bulkInputBackground.style.width = `${getWidth(bulkInput)}px`;

            /**
             * Finds a student based on one of a user's unique identifiers
             * (Can be one of: email, login ID or SIS ID)
             * 
             * @param {string} value A stundent's unique id
             * @returns {object} A user object
             */
            function findUser(value) {
                return courseStudents.find(student => {
                    return (value === student.email ||
                        value === student.login_id ||
                        value === student.sis_user_id);
                });
            }

            // Update the background element on each key input
            bulkInput.addEventListener('input', event => {
                // Get the values of each row
                const values = bulkInput.value.split(/\n/);

                bulkInputBackground.innerHTML = '';

                // Render row for each user
                values.forEach(value => {
                    // Find the user based on the row value
                    const user = findUser(value);
                    const isValid = (user !== undefined);
                    const isEmpty = (value === '');

                    bulkInputBackground.insertAdjacentHTML('beforeend', `
                        <div class="${(!isValid && !isEmpty) ? styles.invalid : ''}" ${isValid ? `data-user-id="${user.id}"` : ''}>
                            <span ${!isEmpty ? `title="${isValid ? user.name : __('user_not_found', { user: value })}"` : ''}>${value}</span>
                        </div>
                    `);
                });

                // Recalculate position and size
                bulkInputBackground.style.top = `${getTop(bulkInput)}px`;
                bulkInputBackground.style.width = `${getWidth(bulkInput)}px`;
            });

            // Synchronize background with testarea scroll position
            bulkInput.addEventListener('scroll', event => {
                bulkInputBackground.style.top = `${getTop(bulkInput)}px`;
            });

            // Prevent key stroke events from bubbling up
            bulkInput.addEventListener('keydown', event => {
                event.stopPropagation();
            });

            // Display a label with the current hovered student's name
            bulkInput.addEventListener('mousemove', event => {
                // Find all the elements underneath the mouse cursor
                const elements = document.elementsFromPoint(event.clientX, event.clientY);
                // Find the span element that's currently set as 'hovered'
                const currentHover = bulkInputWrapper.querySelector(`span.${styles.hover}`);
                // Find the span element that's actually hovered over
                const newHover = elements.find(element => element.matches(`.${styles.bulkInputWrapper} > textarea + div > div > span`));

                // Remove the old hover label
                if (currentHover !== null) {
                    bulkInput.title = '';
                    currentHover.classList.remove(styles.hover);
                }

                // Set the new hover label
                if (newHover !== undefined) {
                    bulkInput.title = newHover.title;
                    newHover.classList.add(styles.hover);
                }
            });

            // Remove the label when the mouse moves away
            bulkInput.addEventListener('mouseleave', event => {
                // Find the span element that's currently set as 'hovered'
                const currentHover = bulkInputWrapper.querySelector(`span.${styles.hover}`);

                // Remove the hover label
                if (currentHover !== null) {
                    bulkInput.title = '';
                    currentHover.classList.remove(styles.hover);
                }
            });
        });

        /**
         * Manipulates the assignment object
         *
         * @param {object} assignment The assignment object
         */
        function customSend(body) {
            const assignment = JSON.parse(body).assignment;

            // Clear the default settings
            assignment.only_visible_to_overrides = true;
            assignment.due_at = null;
            assignment.lock_at = null;
            assignment.unlock_at = null;

            // Overwrite the student ids with the ones from the bulk lists
            assignment.assignment_overrides.forEach(override => {
                const row = document.querySelector(`.Container__DueDateRow-item[data-row-key="${override.rowKey}"]`);
                const items = row.querySelectorAll(`.${styles.bulkInputWrapper} > textarea + div [data-user-id]`);
                const userIds = Array.from(items).map(item => item.dataset.userId);

                override.student_ids = userIds;
            });

            return XMLHttpRequest.prototype.send.call(this, JSON.stringify({ assignment }));
        }

        // Store the native open method as it will be overwritten later
        const originalOpen = XMLHttpRequest.prototype.open;

        // Override the native open method to check for posts of new assignments
        XMLHttpRequest.prototype.open = function (method, url) {
            const isBulkAssignment = document.getElementById(styles.bulkAssignment).checked;
            const isNewAssignment = (
                routeName === 'courses.assignments.new' &&
                method === 'POST' &&
                url === `${window.location.origin}/api/v1/courses/${params.courseId}/assignments`
            );
            const isEditAssignment = (
                routeName === 'courses.assignments.edit' &&
                method === 'PUT' &&
                url === `${window.location.origin}/api/v1/courses/${params.courseId}/assignments/${params.assignmentId}`
            );

            if (isBulkAssignment && (isNewAssignment || isEditAssignment)) {
                // Override the native send method
                this.send = customSend;
            }

            // Call the original open method
            return originalOpen.apply(this, arguments);
        };

    });
}
