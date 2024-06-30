// Main function
use std::collections::HashMap;

pub fn add(a: i32, b: i32) -> i32 {
    // New comment
    let mut map = HashMap::new();
    map.insert("key1", "value1");
    map.insert("key2", "value2");

    // Iterate over the map
    for (key, value) in &map {
        println!("{}: {}", key, value);
    }
}