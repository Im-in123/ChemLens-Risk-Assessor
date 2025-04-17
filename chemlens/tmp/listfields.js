const fs = require("fs");
const path = require("path");

function listAllPaths(obj, currentPath = '', paths = []) {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      listAllPaths(item, `${currentPath}[${index}]`, paths);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      paths.push(newPath);
      listAllPaths(obj[key], newPath, paths);
    }
  }
  return paths;
}

// Adjust path as needed
const filePath = path.join(__dirname, "a.json");

try {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const jsonData = JSON.parse(rawData);

  const allPaths = listAllPaths(jsonData);
  console.log(allPaths.join("\n"));
} catch (err) {
  console.error("Failed to read or parse JSON:", err.message);
}
