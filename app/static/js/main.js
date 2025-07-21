        let currentProject = null;
        let shots = [];
        let savedScrollY = 0;
        let savedRowId = null;
        const NEW_SHOT_DROP_TEXT = 'Drop an asset here to create a new shot.';
        document.documentElement.style.setProperty('--new-shot-drop-text', `'${NEW_SHOT_DROP_TEXT}'`);

        // ---------------------------------------------------------------------------
        //  Simple token auth – prompt once and attach to every fetch request
        // ---------------------------------------------------------------------------

        const API_TOKEN = (function() {
            const saved = localStorage.getItem('shotbuddy_token');
            if (saved) return saved;
            const token = prompt('Enter Shotbuddy access token');
            if (token) localStorage.setItem('shotbuddy_token', token);
            return token || '';
        })();

        const _origFetch = window.fetch.bind(window);
        window.fetch = function(url, options = {}) {
            options.headers = options.headers || {};
            if (API_TOKEN) {
                options.headers['Authorization'] = `Bearer ${API_TOKEN}`;
            }
            return _origFetch(url, options);
        };

        // Menu functions

        async function loadProjectFromManualPath() {
            const input = document.getElementById('manual-path-input');
            const path = input.value.trim();

            // path may be empty if user wants default root; show hint if both input and list unused
            if (!path) {
                showNotification("Opening recent project or using default path...");
            }

            try {
                const response = await fetch('/api/project/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
                });

                const result = await response.json();

                if (result.success) {
                currentProject = result.data;
                showMainInterface();
                loadShots();
                showNotification(`Opened project "${result.data.name}"`);
                } else {
                showNotification(result.error || 'Failed to open project', 'error');
                }
            } catch (error) {
                console.error("Error loading project:", error);
                showNotification("Unexpected error loading project", "error");
            }
        }

        function openCreateProjectModal() {
            // Simply open the modal – path is fixed server-side now
            document.getElementById('new-project-name').value = '';
            document.getElementById('create-project-modal').style.display = 'flex';
            document.getElementById('new-project-name').focus();
        }

        function closeCreateProjectModal() {
            document.getElementById('create-project-modal').style.display = 'none';
        }

        async function confirmCreateProject() {
            const projectName = document.getElementById('new-project-name').value.trim();

            // basePath may be empty; that's okay now
            if (!projectName) {
                showNotification("Please enter a project name.", "error");
                return;
            }

            try {
                const response = await fetch('/api/project/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: '', name: projectName })
                });

                const result = await response.json();

                if (result.success) {
                    currentProject = result.data;
                    closeCreateProjectModal();
                    showMainInterface();
                    loadShots();
                    showNotification(`Created project "${result.data.name}"`);
                } else {
                    showNotification(result.error || 'Failed to create project', 'error');
                }
            } catch (error) {
                console.error('Error creating project:', error);
                showNotification('Unexpected error creating project', 'error');
            }
        }

    
        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            checkForProject();
            loadRecentProjects();
        });

        async function checkForProject() {
            try {
                const response = await fetch('/api/project/current');
                const result = await response.json();
                
                if (result.success && result.data) {
                    currentProject = result.data;
                    showMainInterface();
                    loadShots();
                } else {
                    showSetupScreen();
                }
            } catch (error) {
                console.error('Error checking project:', error);
                showSetupScreen();
            }
        }

        function showSetupScreen() {
            document.getElementById('setup-screen').style.display = 'flex';
            document.getElementById('main-interface').style.display = 'none';
        }

        function showMainInterface() {
            document.getElementById('setup-screen').style.display = 'none';
            document.getElementById('main-interface').style.display = 'block';
            document.getElementById('project-title').textContent = currentProject.name;
        }

        async function loadShots(rowId = null) {
            captureScroll(rowId);
            document.getElementById('loading').style.display = 'block';
            document.getElementById('shot-grid').style.display = 'none';
            
            try {
                const response = await fetch('/api/shots');
                const result = await response.json();
                
                if (result.success) {
                    shots = result.data;
                    renderShots();
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('shot-grid').style.display = 'block';
                    restoreScroll();
                } else {
                    showNotification(result.error || 'Failed to load shots', 'error');
                }
            } catch (error) {
                console.error('Error loading shots:', error);
                showNotification('Error loading shots', 'error');
                document.getElementById('loading').style.display = 'none';
            }
        }

        function renderShots() {
            const shotList = document.getElementById("shot-list");
            shotList.innerHTML = "";

            const finalDropZone = document.createElement("div");
            finalDropZone.className = "drop-between-rows final-drop new-shot-drop-zone";
            finalDropZone.addEventListener("dragover", handleRowDragOver);
            finalDropZone.addEventListener("drop", handleRowDrop);
            finalDropZone.addEventListener("dragleave", handleRowDragLeave);
            const finalBtn = document.createElement("button");
            finalBtn.className = "new-shot-btn inline-new-shot-btn";
            finalBtn.textContent = "New Shot +";
            finalBtn.addEventListener("click", () => {
                addNewShotAfter(finalDropZone.getAttribute("data-after-shot"));
            });
            finalDropZone.appendChild(finalBtn);

            const firstDropZone = document.createElement("div");
            firstDropZone.className = "drop-between-rows first-drop";
            firstDropZone.setAttribute("data-after-shot", "");
            firstDropZone.addEventListener("dragover", handleRowDragOver);
            firstDropZone.addEventListener("drop", handleRowDrop);
            firstDropZone.addEventListener("dragleave", handleRowDragLeave);
            const firstBtn = document.createElement("button");
            firstBtn.className = "new-shot-btn inline-new-shot-btn";
            firstBtn.textContent = "New Shot +";
            firstBtn.addEventListener("click", () => {
                addNewShotAfter(firstDropZone.getAttribute("data-after-shot"));
            });
            firstDropZone.appendChild(firstBtn);

            if (shots.length === 0) {
                finalDropZone.classList.add("empty-state");
                finalDropZone.setAttribute("data-after-shot", "");
                shotList.appendChild(finalDropZone);
                return;
            }

            shotList.appendChild(firstDropZone);

            shots.forEach((shot, index) => {
                const shotRow = createShotRow(shot);
                shotList.appendChild(shotRow);

                if (index < shots.length - 1) {
                    const dropBetween = document.createElement("div");
                    dropBetween.className = "drop-between-rows";
                    dropBetween.setAttribute("data-after-shot", shot.name);
                    dropBetween.addEventListener("dragover", handleRowDragOver);
                    dropBetween.addEventListener("drop", handleRowDrop);
                    dropBetween.addEventListener("dragleave", handleRowDragLeave);
                    const btn = document.createElement("button");
                    btn.className = "new-shot-btn inline-new-shot-btn";
                    btn.textContent = "New Shot +";
                    btn.addEventListener("click", () => {
                        addNewShotAfter(dropBetween.getAttribute("data-after-shot"));
                    });
                    dropBetween.appendChild(btn);
                    shotList.appendChild(dropBetween);
                }
            });

            finalDropZone.setAttribute("data-after-shot", shots[shots.length - 1].name);
            shotList.appendChild(finalDropZone);

            restoreScroll();
        }

        function createShotRow(shot) {
            const row = document.createElement('div');
            row.className = 'shot-row';
            row.id = `shot-row-${shot.name}`;
            
            row.innerHTML = `
                <div class="shot-name" onclick="editShotName(this, '${shot.name}')">${shot.name}</div>
                ${createDropZone(shot, 'image')}
                ${createDropZone(shot, 'video')}
                ${'' /* createLipsyncZone(shot) */}
                <div class="notes-cell">
                    <textarea class="notes-input" 
                              placeholder="Add notes..." 
                              onchange="saveNotes('${shot.name}', this.value)"
                              onblur="saveNotes('${shot.name}', this.value)">${shot.notes || ''}</textarea>
                </div>
            `;
            
            return row;
        }

        function createDropZone(shot, type) {
            const file = shot[type];
            const hasFile = file.version > 0;

            if (hasFile) {
                const thumbnailUrl = file.thumbnail ? `${file.thumbnail}?v=${Date.now()}` : null;
                const thumbnailStyle = thumbnailUrl ? 
                    `background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;` : 
                    'background: #404040;';

            
                return `
                    <div class="drop-zone"
                         ondragover="handleDragOver(event, '${type}')"
                         ondrop="handleDrop(event, '${shot.name}', '${type}')"
                         ondragleave="handleDragLeave(event)">
                        <div class="file-preview">
                            <div class="preview-thumbnail ${type === 'video' ? 'video-thumbnail' : ''}"
                                style="${thumbnailStyle}"></div>

                            <div class="version-badge">v${String(file.version).padStart(3, '0')}</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="drop-zone empty"
                         onclick="openFileDialog('${shot.name}', '${type}')"
                         ondragover="handleDragOver(event, '${type}')"
                         ondrop="handleDrop(event, '${shot.name}', '${type}')"
                         ondragleave="handleDragLeave(event)">
                        <div class="drop-placeholder">
                            <div class="text">Add ${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                        </div>
                    </div>
                `;
            }
        }

        function createLipsyncZone(shot) {
            const parts = ['driver', 'target', 'result'];
            let html = '<div class="lipsync-cell">';
            for (const part of parts) {
                const file = shot.lipsync[part];
                const hasFile = file.version > 0;
                const label = part.charAt(0).toUpperCase() + part.slice(1);
                if (hasFile) {
                    const thumbnailUrl = file.thumbnail ? `${file.thumbnail}?v=${Date.now()}` : null;
                    const thumbnailStyle = thumbnailUrl ?
                        `background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;` :
                        'background: #404040;';
                    html += `
                        <div class="drop-zone lipsync-drop" ondragover="handleDragOver(event, '${part}')" ondrop="handleDrop(event, '${shot.name}', '${part}')" ondragleave="handleDragLeave(event)">
                            <div class="file-preview lipsync-preview">
                                <div class="preview-thumbnail lipsync-thumbnail" data-label="${label}" style="${thumbnailStyle}"></div>
                                <div class="version-badge">v${String(file.version).padStart(3, '0')}</div>
                            </div>
                        </div>`;
                } else {
                    html += `
                        <div class="drop-zone lipsync-drop empty" ondragover="handleDragOver(event, '${part}')" ondrop="handleDrop(event, '${shot.name}', '${part}')" ondragleave="handleDragLeave(event)">
                            <div class="drop-placeholder">
                                <div class="text">${label}</div>
                            </div>
                        </div>`;
                }
            }
            html += '</div>';
            return html;
        }

        async function addNewShot() {
            try {
                const response = await fetch('/api/shots', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'}
                });
                
                const result = await response.json();
                
                if (result.success) {
                    shots.push(result.data);
                    captureScroll(`shot-row-${result.data.name}`);
                    renderShots();
                    restoreScroll();
                    showNotification(`Shot ${result.data.name} created`);
                } else {
                    showNotification(result.error || 'Failed to create shot', 'error');
                }
            } catch (error) {
                console.error('Error creating shot:', error);
                showNotification('Error creating shot', 'error');
            }
        }

        async function addNewShotAfter(afterShot) {
            try {
                const response = await fetch('/api/shots/create-between', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ after_shot: afterShot || null })
                });

                const result = await response.json();

                if (result.success) {
                    const index = afterShot ? shots.findIndex(s => s.name === afterShot) + 1 : 0;
                    shots.splice(index, 0, result.data);
                    captureScroll(`shot-row-${result.data.name}`);
                    renderShots();
                    restoreScroll();
                    showNotification(`Shot ${result.data.name} created`);
                } else {
                    showNotification(result.error || 'Failed to create shot', 'error');
                }
            } catch (error) {
                console.error('Error creating shot:', error);
                showNotification('Error creating shot', 'error');
            }
        }

        // Drag and drop handlers
        function handleDragOver(event, fileType) {
            event.preventDefault();
            event.currentTarget.classList.add('drag-over');
        }

        function handleDragLeave(event) {
            event.currentTarget.classList.remove('drag-over');
        }

        async function handleDrop(event, shotName, expectedType) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');

            const files = event.dataTransfer.files;
            if (files.length === 0) {
                showNotification('No files dropped', 'error');
                return;
            }

            const file = files[0];
            await uploadFile(file, shotName, expectedType);
        }

        async function uploadFile(file, shotName, fileType) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('shot_name', shotName);
            formData.append('file_type', fileType);

            try {
                showNotification('Uploading file...');
                
                const response = await fetch('/api/shots/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(`${file.name} uploaded successfully!`);
                    loadShots(`shot-row-${shotName}`); // Refresh and keep scroll
                } else {
                    showNotification(result.error || 'Upload failed', 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showNotification('Upload failed', 'error');
            }
        }

        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        function captureScroll(rowId = null) {
            savedScrollY = window.pageYOffset;
            savedRowId = rowId;
        }

        function restoreScroll() {
            if (savedRowId) {
                const el = document.getElementById(savedRowId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    savedRowId = null;
                    return;
                }
            }
            window.scrollTo({ top: savedScrollY });
            savedRowId = null;
        }

        // Drag and drop handlers for rows
        function handleRowDragOver(event) {
            event.preventDefault();

            // Some browsers do not populate `dataTransfer.files` during
            // `dragover`, so check the types list instead. If it includes
            // "Files", we assume a file is being dragged and show the marker.
            const types = event.dataTransfer.types;
            if (types && Array.from(types).includes('Files')) {
                event.currentTarget.classList.add('drag-over', 'new-shot-drop-zone');
            }
        }

        function handleRowDragLeave(event) {
            event.currentTarget.classList.remove('drag-over', 'new-shot-drop-zone');
        }

        async function handleRowDrop(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over', 'new-shot-drop-zone');

            const files = event.dataTransfer.files;
            if (files.length === 0) return;

            const afterShot = event.currentTarget.getAttribute('data-after-shot');
            
            try {
                // Create new shot
                const response = await fetch('/api/shots/create-between', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        after_shot: afterShot || null
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const newShot = result.data;
                    showNotification(`Shot ${newShot.name} created`);
                    
                    // Upload the file to the new shot
                    const file = files[0];
                    const fileType = getFileType(file.name);
                    
                    if (fileType) {
                        await uploadFile(file, newShot.name, fileType);
                    } else {
                        showNotification('Unsupported file type', 'error');
                        loadShots(`shot-row-${newShot.name}`); // Still refresh to show the new shot
                    }
                } else {
                    showNotification(result.error || 'Failed to create shot', 'error');
                }
            } catch (error) {
                console.error('Error creating shot:', error);
                showNotification('Error creating shot', 'error');
            }
        }

        function getFileType(filename) {
            const ext = filename.toLowerCase().split('.').pop();
            const imageExts = ['jpg', 'jpeg', 'png', 'webp'];
            const videoExts = ['mp4', 'mov'];

            if (imageExts.includes(ext)) return 'image';
            if (videoExts.includes(ext)) return 'video';
            return null;
        }

        function openFileDialog(shotName, fileType) {
            const input = document.createElement('input');
            input.type = 'file';
            if (fileType === 'image') {
                input.accept = 'image/*';
            } else if (fileType === 'video') {
                input.accept = 'video/*';
            }
            input.style.display = 'none';
            input.addEventListener('change', () => {
                if (input.files && input.files[0]) {
                    uploadFile(input.files[0], shotName, fileType);
                }
                input.remove();
            });
            document.body.appendChild(input);
            input.click();
        }

        async function saveNotes(shotName, notes) {
            try {
                const response = await fetch('/api/shots/notes', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        shot_name: shotName,
                        notes: notes
                    })
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    showNotification(result.error || 'Failed to save notes', 'error');
                }
                // Don't show success notification for notes to avoid spam
            } catch (error) {
                console.error('Error saving notes:', error);
                showNotification('Error saving notes', 'error');
            }
        }

function editShotName(element, currentName) {
    const newName = prompt('Enter new shot name', currentName);
    if (!newName || newName === currentName) {
        return;
    }
    renameShot(currentName, newName);
}

async function renameShot(oldName, newName) {
    try {
        const response = await fetch('/api/shots/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_name: oldName, new_name: newName })
        });
        const result = await response.json();
        if (result.success) {
            showNotification(`Renamed to ${newName}`);
            loadShots(`shot-row-${newName}`);
        } else {
            showNotification(result.error || 'Rename failed', 'error');
        }
    } catch (error) {
        console.error('Rename failed:', error);
        showNotification('Rename failed', 'error');
    }
}

        async function loadRecentProjects() {
            try {
                const response = await fetch('/api/project/recent');
                const result = await response.json();

                if (result.success) {
                    const list = document.getElementById('recent-projects-list');
                    const selector = document.getElementById('project-selector');

                    list.innerHTML = '';
                    selector.innerHTML = '';

                    if (result.data.length === 0) {
                        const li = document.createElement('li');
                        li.textContent = 'No recent projects.';
                        li.style.color = '#808080';
                        list.appendChild(li);
                        return;
                    }

                    result.data.forEach(project => {
                        const li = document.createElement('li');
                        li.className = 'recent-project-item';
                        li.style.cursor = 'pointer';
                        li.style.padding = '6px 0';
                        li.textContent = project.name;
                        li.addEventListener('click', () => {
                            openRecentProject(project.path);
                        });
                        list.appendChild(li);

                        // selector option
                        const option = document.createElement('option');
                        option.value = project.path;
                        option.textContent = project.name;
                        if (currentProject && currentProject.path === project.path) {
                            option.selected = true;
                        }
                        selector.appendChild(option);
                    });

                    // Show selector when we have at least one project
                    if (result.data.length > 0) {
                        selector.style.display = 'block';
                        selector.onchange = function() {
                            const path = selector.value;
                            if (path) openRecentProject(path);
                        };
                    }
                }
            } catch (e) {
                console.error('Failed to load recent projects', e);
            }
        }

        async function openRecentProject(projectPath) {
            try {
                const response = await fetch('/api/project/open', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: projectPath })
                });
                const result = await response.json();
                if (result.success) {
                    currentProject = result.data;
                    showMainInterface();
                    loadShots();
                    showNotification(`Opened project "${result.data.name}"`);
                } else {
                    showNotification(result.error || 'Failed to open project', 'error');
                }
            } catch (e) {
                console.error('Failed to open project', e);
                showNotification('Failed to open project', 'error');
            }
        }
