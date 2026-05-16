document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const workspace = document.getElementById('workspace');
    const imagePreview = document.getElementById('imagePreview');
    const filenameDisplay = document.getElementById('filenameDisplay');
    const formatDisplay = document.getElementById('formatDisplay');
    const sizeDisplay = document.getElementById('sizeDisplay');
    const btnToPng = document.getElementById('btnToPng');
    const btnToJpg = document.getElementById('btnToJpg');
    const btnConvert = document.getElementById('btnConvert');
    const btnDownload = document.getElementById('btnDownload');
    const btnReset = document.getElementById('btnReset');
    const processingOverlay = document.getElementById('processingOverlay');
    const toastContainer = document.getElementById('toastContainer');

    let currentFile = null;
    let targetFormat = 'image/png'; // Default to PNG

    // Setup format toggle
    btnToPng.addEventListener('click', () => {
        targetFormat = 'image/png';
        btnToPng.classList.add('active');
        btnToJpg.classList.remove('active');
        updateActionState();
    });

    btnToJpg.addEventListener('click', () => {
        targetFormat = 'image/jpeg';
        btnToJpg.classList.add('active');
        btnToPng.classList.remove('active');
        updateActionState();
    });

    // File Input clicks
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('drag-active');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        
        if (!SUPPORTED_TYPES.includes(file.type)) {
            showToast('Unsupported file type. Please upload a JPG or PNG.', 'error');
            return;
        }

        currentFile = file;
        
        // Setup Workspace
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            filenameDisplay.textContent = truncateString(file.name, 20);
            formatDisplay.textContent = file.type.split('/')[1].toUpperCase();
            sizeDisplay.textContent = formatBytes(file.size);
            
            // Un-hide workspace
            dropzone.style.display = 'none';
            workspace.classList.add('active');

            // Autoselect target format based on input
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                btnToPng.click();
            } else {
                btnToJpg.click();
            }

            // reset states
            btnConvert.style.display = 'flex';
            btnDownload.classList.remove('active');
            btnDownload.href = '#';
        };
        reader.onerror = () => {
            showToast('Error reading file', 'error');
        };
        reader.readAsDataURL(file);
    }

    function updateActionState() {
        if (currentFile && btnDownload.classList.contains('active')) {
            // Document already converted and format switched, reset to allow convert again
            btnConvert.style.display = 'flex';
            btnDownload.classList.remove('active');
        }
    }

    btnReset.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        workspace.classList.remove('active');
        dropzone.style.display = 'block';
        imagePreview.src = '';
        btnDownload.classList.remove('active');
        btnConvert.style.display = 'flex';
    });

    btnConvert.addEventListener('click', async () => {
        if (!currentFile) return;

        // Show Processing
        processingOverlay.classList.add('active');

        // Allow UI to update before heavy canvas work
        setTimeout(async () => {
            try {
                const dataUrl = await convertImage(imagePreview.src, targetFormat);
                
                // Set download link
                const ext = targetFormat === 'image/jpeg' ? 'jpg' : 'png';
                const baseName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
                
                btnDownload.href = dataUrl;
                btnDownload.download = `${baseName}_converted.${ext}`;
                
                // Toggle buttons
                btnConvert.style.display = 'none';
                btnDownload.classList.add('active');
                
                showToast('Image converted successfully!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Conversion failed. Please try again.', 'error');
            } finally {
                processingOverlay.classList.remove('active');
            }
        }, 300);
    });

    function convertImage(src, targetMimeType) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // If converting to JPEG, we need a white background instead of transparent (black anomaly)
                if (targetMimeType === 'image/jpeg' || targetMimeType === 'image/jpg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                // Draw Image
                ctx.drawImage(img, 0, 0);
                
                // Output quality 0.92 for jpeg, ignored for png
                const dataURL = canvas.toDataURL(targetMimeType, 0.92);
                resolve(dataURL);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image on canvas'));
            };
            img.src = src;
        });
    }

    function showToast(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastFadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function truncateString(str, num) {
        if (str.length <= num) return str;
        return str.slice(0, num) + '...';
    }
});
