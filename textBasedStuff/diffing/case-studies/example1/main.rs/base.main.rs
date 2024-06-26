fn main() {
    println!("Hello, world!");
}

// More Rust code here to make it about 60 lines long

fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }
}

// Additional functions
fn subtract(a: i32, b: i32) -> i32 {
    a - b
}

fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

fn divide(a: i32, b: i32) -> Option<i32> {
    if b == 0 {
        None
    } else {
        Some(a / b)
    }
}

// Main function with more functionality
fn main() {
    let x = 10;
    let y = 5;

    println!("Add: {}", add(x, y));
    println!("Subtract: {}", subtract(x, y));
    println!("Multiply: {}", multiply(x, y));
    match divide(x, y) {
        Some(result) => println!("Divide: {}", result),
        None => println!("Cannot divide by zero"),
    }
}
