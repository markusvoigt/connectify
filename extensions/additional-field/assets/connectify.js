async function submitChanges(updates) {
  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      updates,
    }),
  };

  await fetch("/apps/connectify/submit", fetchOptions);
  return;
}

async function update() {
  document.getElementById("submit").disabled = true;
  const inputElements = $("#mfForm :input");
  const updates = [];
  for (let i = 0; i < inputElements.length - 1; i++) {
    const key = inputElements[i].id;
    const value = inputElements[i].value;
    const type = inputElements.eq(i).data("type");
    updates.push({ key, value, type });
  }
  await submitChanges(updates);
  setTimeout(() => {
    document.getElementById("submit").disabled = false;
  }, 2000);
}
