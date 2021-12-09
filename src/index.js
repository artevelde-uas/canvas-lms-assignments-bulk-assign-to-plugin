import { router, dom, api } from '@artevelde-uas/canvas-lms-app';

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

                    alert('There are some invalid users that need to be corrected or removed from one of the bulk lists');

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

        dom.onElementAdded('.overrides-column-right', overridesColumnRight => {
            overridesColumnRight.insertAdjacentHTML('beforebegin', `
                <div class="form-column-right ${styles.bulkOverridesRow}">
                    <div class="border border-trbl border-round">
                        <label class="checkbox flush">
                            <input type="checkbox" id="${styles.bulkAssignment}" />
                            Bulk assignment
                        </label>
                    </div>
                </div>
                <div></div>
                <div class="form-column-left"></div>
            `);

            const bulkAssignment = document.getElementById(styles.bulkAssignment);

            bulkAssignment.addEventListener('change', event => {
                overridesColumnRight.classList.toggle(styles.bulk, event.target.checked);
            });
        }, { once: true });

        const courseStudents = await api.get(`/courses/${params.courseId}/users`, {
            per_page: 100,
            enrollment_type: 'student'
        });

        dom.onElementAdded('.Container__DueDateRow-item', dueDateRow => {
            const icTokens = dueDateRow.querySelector('#assign-to-label + div');

            icTokens.insertAdjacentHTML('afterend', `
                <div class="${styles.bulkInputWrapper}">
                    <textarea></textarea>
                    <div></div>
                </div>
            `);

            function getTop(element) {
                const elementStyles = getComputedStyle(element);
                const paddingTop = Number.parseInt(elementStyles.paddingTop);
                const borderTopWidth = Number.parseInt(elementStyles.borderTopWidth);

                return (paddingTop + borderTopWidth) - element.scrollTop;
            }

            function getLeft(element) {
                const elementStyles = getComputedStyle(element);
                const paddingLeft = Number.parseInt(elementStyles.paddingLeft);
                const borderLeftWidth = Number.parseInt(elementStyles.borderLeftWidth);

                return paddingLeft + borderLeftWidth;
            }

            function getWidth(element) {
                const elementStyles = getComputedStyle(element);
                const paddingLeft = Number.parseInt(elementStyles.paddingLeft);
                const paddingRight = Number.parseInt(elementStyles.paddingRight);

                return element.clientWidth - (paddingLeft + paddingRight);
            }

            const bulkInputWrapper = dueDateRow.querySelector(`.${styles.bulkInputWrapper}`);
            const bulkInput = bulkInputWrapper.querySelector(`textarea`);
            const bulkInputBackground = bulkInputWrapper.querySelector(`textarea + div`);

            bulkInputBackground.style.top = `${getTop(bulkInput)}px`;
            bulkInputBackground.style.left = `${getLeft(bulkInput)}px`;
            bulkInputBackground.style.width = `${getWidth(bulkInput)}px`;

            function findUser(value) {
                return courseStudents.find(student => {
                    return (value === student.email ||
                        value === student.login_id ||
                        value === student.sis_user_id);
                });
            }

            bulkInput.addEventListener('input', event => {
                const values = bulkInput.value.split(/\n/);

                bulkInputBackground.innerHTML = '';

                values.forEach(value => {
                    const user = findUser(value);
                    const isValid = (user !== undefined);
                    const isEmpty = (value === '');

                    bulkInputBackground.insertAdjacentHTML('beforeend', `
                        <div class="${(!isValid && !isEmpty) ? styles.invalid : ''}" ${isValid ? `data-user-id="${user.id}"` : ''}>
                            <span ${!isEmpty ? `title="${isValid ? user.name : `User '${value}' not found`}"` : ''}>${value}</span>
                        </div>
                    `);
                });

                bulkInputBackground.style.top = `${getTop(bulkInput)}px`;
                bulkInputBackground.style.width = `${getWidth(bulkInput)}px`;
            });

            bulkInput.addEventListener('scroll', event => {
                bulkInputBackground.style.top = `${getTop(bulkInput)}px`;
            });

            bulkInput.addEventListener('keydown', event => {
                event.stopPropagation();
            });

            bulkInput.addEventListener('mousemove', event => {
                const elements = document.elementsFromPoint(event.clientX, event.clientY);
                const currentHover = bulkInputWrapper.querySelector(`span.${styles.hover}`);
                const newHover = elements.find(element => element.matches(`.${styles.bulkInputWrapper} > textarea + div > div > span`));

                if (currentHover !== null) {
                    bulkInput.title = '';
                    currentHover.classList.remove(styles.hover);
                }

                if (newHover !== undefined) {
                    bulkInput.title = newHover.title;
                    newHover.classList.add(styles.hover);
                }
            });

            bulkInput.addEventListener('mouseleave', event => {
                const currentHover = bulkInputWrapper.querySelector(`span.${styles.hover}`);

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
