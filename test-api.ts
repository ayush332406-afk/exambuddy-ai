import fetch from "node-fetch";

async function run() {
  try {
    const res = await fetch("http://0.0.0.0:3000/api/notes");
    console.log(res.status);
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
run();
