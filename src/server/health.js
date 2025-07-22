/**
 * @fileoverview Health monitoring system for tracking service status
 * @description This module provides functionality to track and monitor the health status
 * of various services in the application.
 */

/**
 * Array storing health status information for all services
 * @type {Array<{name: string, status: string, reason: string|null}>}
 * @private
 */
let health = [];

/**
 * Checks if all services are healthy
 * @returns {boolean} True if all services have "ok" status, false otherwise
 */
function is_healthy() {
    return health.every((item) => item.status === "ok");
}

/**
 * Health array structure example:
 * @example
 * [
 *   { name: "service1", status: "ok", reason: null},
 *   { name: "service2", status: "error", 
 *     reason: "TypeError: config `timeout` is not a number." },
 *   ...
 * ]
 */

/**
 * Adds or updates health status for a named service
 * @param {string} name - The name of the service
 * @param {string} status - The status of the service (e.g., "ok", "error")
 * @param {string|null} [reason=null] - Optional reason for the status (especially for errors)
 */
function push_health(name, status, reason = null) {
    let index = health.findIndex((item) => item.name === name);
    if (index === -1) {
        health.push({ name, status, reason });
    } else {
        health[index] = { name, status, reason };
    }
}

/**
 * Clears all health status records
 * @returns {void}
 */
function clear_health() {
    health = [];
}

/**
 * Gets the current health status array
 * @returns {Array<{name: string, status: string, reason: string|null}>} Array of health status objects
 */
function get_health() {
    return health;
}

/**
 * Health monitoring module exports
 * @namespace HealthModule
 * @type {Object}
 * @property {Function} is_healthy - Check if all services are healthy
 * @property {Function} push_health - Add or update service health status
 * @property {Function} clear_health - Clear all health records
 * @property {Function} get_health - Get current health status array
 */
export default Object.freeze({
    is_healthy,
    push_health,
    clear_health,
    get_health
});