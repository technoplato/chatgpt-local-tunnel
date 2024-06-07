console.log("Hello, TypeScript");

// TypeScript code here

function add(a: number, b: number): number {
    return a + b;
}

// More functions
function subtract(a: number, b: number): number {
    return a - b;
}

function multiply(a: number, b: number): number {
    return a * b;
}

function divide(a: number, b: number): number | null {
    if (b === 0) {
        return null;
    } else {
        return a / b;
    }
}

// Main function
function main() {
    const x = 10;
    const y = 5;

    console.log(`Add: ${add(x, y)}`);
    console.log(`Subtract: ${subtract(x, y)}`);
    console.log(`Multiply: ${multiply(x, y)}`);
    const result = divide(x, y);
    if (result !== null) {
        console.log(`Divide: ${result}`);
    } else {
        console.log("Cannot divide by zero");
    }
}

main();