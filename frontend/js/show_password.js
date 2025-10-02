const pwInput = document.getElementById('signup-password');
  const toggle = document.getElementById('toggle-pw');

  // show password while holding mouse
  toggle.addEventListener('mousedown', () => {
    pwInput.type = 'text';
  });
  toggle.addEventListener('mouseup', () => {
    pwInput.type = 'password';
  });
  toggle.addEventListener('mouseleave', () => {
    pwInput.type = 'password';
  });

  // support touch (mobile)
  toggle.addEventListener('touchstart', () => {
    pwInput.type = 'text';
  }, {passive:true});
  toggle.addEventListener('touchend', () => {
    pwInput.type = 'password';
  });