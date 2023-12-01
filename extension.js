const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function activate(context) {
  let disposable = vscode.commands.registerCommand("extension.createReactComponent", function (uri) {
    vscode.window.showInputBox({ prompt: "Component Name" }).then((componentName) => {
      if (!componentName) return;
      const componentFolder = path.join(uri.fsPath, componentName);
      const jsxContent = `import "./${componentName}.scss";\nconst ${componentName} = () => {\n  return (\n    <>\n    \n    </>\n  );\n}\nexport default ${componentName};\n`;

      if (!fs.existsSync(componentFolder)) {
        fs.mkdirSync(componentFolder);
      }

      fs.writeFileSync(path.join(componentFolder, `${componentName}.jsx`), jsxContent);
      fs.writeFileSync(path.join(componentFolder, `${componentName}.scss`), "");
    });
  });

  let renameDisposable = vscode.commands.registerCommand("extension.renameReactComponent", function (uri) {
    vscode.window.showInputBox({ prompt: "New Component Name" }).then((newComponentName) => {
      if (!newComponentName) return;
      renameComponent(uri.fsPath, path.basename(uri.fsPath), newComponentName);
    });
  });

  context.subscriptions.push(renameDisposable);
  context.subscriptions.push(disposable);


  let convertToComponentDisposable = vscode.commands.registerCommand("extension.convertToExternalReactComponent", function () {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return;

    const selection = activeEditor.selection;
    const selectedText = activeEditor.document.getText(selection);

    if (!isValidFunction(selectedText)) {
        vscode.window.showErrorMessage("Please select a valid function or arrow function.");
        return;
    }

    const componentName = extractFunctionName(selectedText);
    if (!componentName) {
        vscode.window.showErrorMessage("Cannot extract component name from selection.");
        return;
    }

    const componentFolder = path.join(path.dirname(activeEditor.document.uri.fsPath), componentName);
    createReactComponentFile(componentFolder, componentName, selectedText);


    
    updateOriginalFile(activeEditor, selection, componentName, componentFolder);
});

context.subscriptions.push(convertToComponentDisposable);

}


function isValidFunction(text) {
  return text.includes('function') || text.includes('=>');
}

function extractFunctionName(text) {
  const match = text.match(/const\s+(\w+)\s+=\s+\(/) || text.match(/function\s+(\w+)\s*\(/);
  return match ? match[1] : null;
}

function createReactComponentFile(componentFolder, componentName, content) {
  if (!fs.existsSync(componentFolder)) {
      fs.mkdirSync(componentFolder);
  }

  const jsxContent = `import React from 'react';\n${content}\n\nexport default ${componentName};`;
  fs.writeFileSync(path.join(componentFolder, `${componentName}.jsx`), jsxContent);
}



function updateOriginalFile(editor, selection, componentName, componentFolder) {
  const importStatement = `import ${componentName} from './${componentName}/${componentName}';\n`;
  const jsxTag = `<${componentName} />`;
  
  editor.edit((editBuilder) => {
      editBuilder.replace(selection, jsxTag);
      editBuilder.insert(new vscode.Position(0, 0), importStatement);
  });
}


function renameComponent(componentPath, oldComponentName, newComponentName) {
  const folderPath = path.dirname(componentPath);

  // Rename the main component folder
  const newComponentFolderPath = path.join(folderPath, newComponentName);
  if (fs.existsSync(componentPath)) {
    fs.renameSync(componentPath, newComponentFolderPath);
  }

  // Rename and replace in files and subdirectories
  const renameAndReplace = (folderPath) => {
    fs.readdirSync(folderPath).forEach((fileOrDir) => {
      const fullPath = path.join(folderPath, fileOrDir);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        const newDirName = fileOrDir.replace(oldComponentName, newComponentName);
        const newFullPath = path.join(folderPath, newDirName);
        renameAndReplace(fullPath); // Recursively rename inside this directory
        fs.renameSync(fullPath, newFullPath);
      } else {
        // Replace content in files
        let content = fs.readFileSync(fullPath, "utf8");
        const regex = new RegExp(`\\b${oldComponentName}`, "g");
        content = content.replace(regex, newComponentName);
        fs.writeFileSync(fullPath, content);

        // Rename file if it starts with old component name
        if (fileOrDir.startsWith(oldComponentName)) {
          const newFileName = fileOrDir.replace(oldComponentName, newComponentName);
          const newFilePath = path.join(folderPath, newFileName);
          fs.renameSync(fullPath, newFilePath);
        }
      }
    });
  };

  renameAndReplace(newComponentFolderPath);
}
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
