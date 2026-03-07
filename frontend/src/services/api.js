import axios from 'axios';

// Get API URL from environment variables or default to localhost, ensuring no trailing slash
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');

/**
 * Marks attendance for a given roll number.
 * @param {string} rollNo - The student's roll number.
 * @returns {Promise<Object>} - The server response containing message and student details.
 * @throws {Error} - Throws an error if the request fails.
 */
export const markAttendance = async (rollNo) => {
    try {
        const response = await axios.post(`${API_URL}/api/mark-attendance`, { rollNo });
        return response.data;
    } catch (error) {
        console.error("API Error Details:", {
            message: error.message,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data
        });

        // Enhance error object with useful message and status code
        const errorMessage = error.response?.data?.error || "Connection Error";
        const enhancedError = new Error(errorMessage);
        enhancedError.originalError = error;
        enhancedError.statusCode = error.response?.status || null;
        throw enhancedError;
    }
};

/**
 * Fetches the full attendance list.
 * @returns {Promise<Object>} The list of students.
 */
export const getAttendance = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/attendance`);
        return response.data;
    } catch (error) {
        console.error("API Error Details:", {
            message: error.message,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data
        });
        throw new Error(error.response?.data?.error || 'Failed to fetch attendance list');
    }
};

/**
 * Registers a new student or marks an existing one as present.
 * @param {Object} studentData - { name, rollNo, branch, password }
 * @returns {Promise<Object>}
 */
export const spotRegister = async (studentData) => {
    try {
        const response = await axios.post(`${API_URL}/api/spot-register`, studentData);
        return response.data;
    } catch (error) {
        console.error("API Error Details:", {
            message: error.message,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data
        });
        throw new Error(error.response?.data?.error || 'Spot registration failed');
    }
};

/**
 * Verifies the portal password.
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export const verifyPassword = async (password) => {
    try {
        const response = await axios.post(`${API_URL}/api/verify-password`, { password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Verification failed');
    }
};
