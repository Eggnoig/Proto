function randomId() {
  return Math.random().toString(36).substring(2, 8);
}

const newBoardBtn = document.getElementById('new-board-btn');
const newDocBtn = document.getElementById('new-doc-btn');
const openBtn = document.getElementById('open-btn');
const existingInput = document.getElementById('existing-id');
const resourceSelect = document.getElementById('resource-type');

function goToBoard(id = randomId()) {
  window.location.href = `/${id}`;
}

function goToDoc(id = randomId()) {
  window.location.href = `/docs/${id}`;
}

if (newBoardBtn) {
  newBoardBtn.addEventListener('click', () => goToBoard());
}

if (newDocBtn) {
  newDocBtn.addEventListener('click', () => goToDoc());
}

if (openBtn && existingInput && resourceSelect) {
  openBtn.addEventListener('click', () => {
    const value = (existingInput.value || '').trim();
    if (!value) return;
    if (resourceSelect.value === 'doc') {
      goToDoc(value);
    } else {
      goToBoard(value);
    }
  });
}

if (existingInput) {
  existingInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      openBtn?.click();
    }
  });
}
