const pathParts = window.location.pathname.split('/').filter(Boolean);
let docId = pathParts[1];
if (!docId) {
  docId = Math.random().toString(36).substring(2, 8);
  const newPath = `/docs/${docId}`;
  if (window.location.pathname !== newPath) {
    window.history.replaceState(null, '', newPath);
  }
}
const boardId = `doc-${docId}`;
const socket = io({
  query: { boardId }
});

const docLabel = document.getElementById('doc-label');
const docHint = document.getElementById('doc-hint');
const copyDocLinkBtn = document.getElementById('copy-doc-link');
const backHomeBtn = document.getElementById('back-home');
const editor = document.getElementById('doc-editor');
const syncStatus = document.getElementById('sync-status');
const docUrl = `${window.location.origin}/docs/${docId}`;

if (docLabel) {
  docLabel.textContent = `Document ${docId}`;
}
if (docHint) {
  docHint.textContent = `Share this link: ${docUrl}`;
}

function setStatus(message) {
  if (syncStatus) {
    syncStatus.textContent = message;
  }
}

if (copyDocLinkBtn) {
  copyDocLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(docUrl);
      copyDocLinkBtn.textContent = 'Link copied!';
      setTimeout(() => {
        copyDocLinkBtn.textContent = 'Copy share link';
      }, 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  });
}

if (backHomeBtn) {
  backHomeBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
}

let isApplyingRemoteUpdate = false;

if (editor) {
  editor.addEventListener('input', () => {
    if (isApplyingRemoteUpdate) {
      return;
    }
    const content = editor.value;
    setStatus('Syncing…');
    socket.emit('doc_update', { content });
  });
}

socket.on('connect', () => {
  setStatus('Connected. Syncing…');
  socket.emit('doc_sync_request');
});

socket.on('doc_sync', (data = {}) => {
  const content = typeof data.content === 'string' ? data.content : '';
  if (editor && editor.value !== content) {
    isApplyingRemoteUpdate = true;
    editor.value = content;
    isApplyingRemoteUpdate = false;
  }
  setStatus('Up to date');
});

socket.on('doc_update', (data = {}) => {
  const content = typeof data.content === 'string' ? data.content : '';
  if (!editor) return;
  if (document.activeElement === editor) {
    const { selectionStart, selectionEnd } = editor;
    isApplyingRemoteUpdate = true;
    editor.value = content;
    editor.setSelectionRange(selectionStart, selectionEnd);
    isApplyingRemoteUpdate = false;
  } else {
    isApplyingRemoteUpdate = true;
    editor.value = content;
    isApplyingRemoteUpdate = false;
  }
  setStatus('Updated just now');
});

socket.on('disconnect', () => {
  setStatus('Reconnecting…');
});
