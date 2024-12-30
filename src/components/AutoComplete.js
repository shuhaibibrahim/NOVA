import React, { useState } from "react";

const AutocompleteDropdown = ({ options, setValueOnSelect }) => {
  const [inputValue, setInputValue] = useState(""); // State for input value
  const [filteredOptions, setFilteredOptions] = useState([]); // State for filtered options
  const [showDropdown, setShowDropdown] = useState(false); // State to toggle dropdown

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Filter options based on input
    const filtered = options.filter((option) =>
      option.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOptions(filtered);

    // Show dropdown only if there are matches and input is not empty
    setShowDropdown(filtered.length > 0 && value !== "");
  };

  const handleOptionClick = (option) => {
    setInputValue(option); // Set the selected value
    setValueOnSelect(option)
    setShowDropdown(false); // Hide dropdown
  };

  return (
    <div style={{width:"100%", position:"relative"}}>
        {/* Input Field */}
        {/* <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)} // Show dropdown on focus
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            placeholder="Type to search..."
        /> */}
        <div className="relative w-full overflow-hidden rounded ring-2 ring-blue-200">
            <input 
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setShowDropdown(true)} // Show dropdown on focus
                className='w-full bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
            />
            <div
                className="w-5 h-5 aspect-sqaure bg-blue-500 transform rotate-45 absolute -right-2.5 -bottom-2.5"
            />
        </div>

        {/* Dropdown Options */}
        {showDropdown && (
            <ul
                className="absolute top-full left-0 right-0 overflow-y-auto bg-gray-100 mt-1 m-0 p-0 z-10 "
            >
            {filteredOptions.map((option, index) => (
                <li
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    className="p-2 cursor-pointer hover:bg-blue-100 border-b-1 border-gray-800 text-left"
                >
                    {option}
                </li>
            ))}

            {/* If no matches */}
            {filteredOptions.length === 0 && (
                <li style={{ padding: "8px", color: "#aaa" }}>No matches found</li>
            )}
            </ul>
        )}
        </div>
    );
};

export default AutocompleteDropdown;
