document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('interest-form');
const statusBox = document.getElementById('form-status');

const setFormMessage = (message, type = 'success') => {
  statusBox.textContent = message;
  statusBox.className = `form-status ${type}`;
};

const validateForm = (payload) => {
  const errors = [];

  if (!payload.full_name || payload.full_name.trim().length < 2) {
    errors.push('Full name is required.');
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('Please enter a valid email address.');
  }

  if (payload.phone && payload.phone.trim().length < 7) {
    errors.push('Phone number must be at least 7 characters long if provided.');
  }

  if (!payload.county || payload.county.trim().length < 2) {
    errors.push('County is required.');
  }

  if (!payload.message || payload.message.trim().length < 20) {
    errors.push('Your message must be at least 20 characters long.');
  }

  if (!payload.consent) {
    errors.push('You must agree to the privacy notice.');
  }

  return errors;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    full_name: form.full_name.value,
    email: form.email.value,
    phone: form.phone.value,
    county: form.county.value,
    message: form.message.value,
    consent: form.consent.checked,
  };

  const errors = validateForm(payload);
  if (errors.length > 0) {
    setFormMessage(errors.join(' '), 'error');
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setFormMessage('Submitting your interest…', 'success');

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      const detailText = Array.isArray(result.details) ? result.details.join(' ') : result.error || 'Unable to submit your interest.';
      setFormMessage(detailText, 'error');
      submitButton.disabled = false;
      return;
    }

    form.reset();
    setFormMessage(result.message || 'Your interest has been submitted successfully.', 'success');
    submitButton.disabled = false;
  } catch (error) {
    console.error('Submission failed:', error);
    setFormMessage('There was a connection error. Please try again later.', 'error');
    submitButton.disabled = false;
  }
});
