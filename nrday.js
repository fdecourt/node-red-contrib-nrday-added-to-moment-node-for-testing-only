// Import required modules from dayjs
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const localizedFormat = require('dayjs/plugin/localizedFormat');
const relativeTime = require('dayjs/plugin/relativeTime');
const advancedFormat = require('dayjs/plugin/advancedFormat');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const toObject = require('dayjs/plugin/toObject');

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(toObject);

// The main DateHandler class that manages all date/time manipulations
class DateHandler {
    constructor(config, msg, RED, node) {
        console.log("[DateHandler] Initializing with config:", config);

        // Assign configuration and msg to the instance
        this.RED = RED;
        this.node = node;
        this.msg = msg;
        this.input = config.input || '';
        this.inputType = config.inputType || 'msg';
        this.inputFormat = config.inputFormat || 'YYYY-MM-DD';
        this.inTz = config.inTz || dayjs.tz.guess();
        this.adjAmount = config.adjAmount || 0;
        this.adjType = config.adjType || 'days';
        this.adjDir = config.adjDir || 'add';
        this.format = config.format || 'iso8601';
        this.outTz = config.outTz || this.inTz;
        this.locale = config.locale || 'en';
        this.output = config.output || 'payload';
        this.outputType = config.outputType || 'msg';

        // Initialize dayjs with the specified locale
        this.setLocale(this.locale);

        // Retrieve and process the input value
        console.log("[DateHandler] Retrieving input value...");
        this.rawInput = this.handleValue('GET', this.input, this.inputType); 
        console.log("[DateHandler] Raw input obtained:", this.rawInput);

        // Initialize the date based on the input
        this.date = this.initializeDate();
        console.log("[DateHandler] Date initialized:", this.date.format());
    }

    // Method to set the locale for dayjs
    setLocale(locale) {
        try {
            require(`dayjs/locale/${locale}`); // Dynamically import the locale
            dayjs.locale(locale); // Set the locale globally for Day.js
            console.log(`[DateHandler] Locale loaded and set to: ${locale}`);
        } catch (error) {
            console.warn(`[DateHandler] Failed to load locale '${locale}', defaulting to 'en'. Error: ${error.message}`);
            dayjs.locale('en'); // Default to 'en' if the locale is invalid
        }
    }

// Unified method for handling both retrieving and setting values based on the mode
    handleValue(mode = 'GET', fieldName, fieldType, value = null) {
        console.log(`[handleValue] Mode: ${mode}, FieldName: ${fieldName}, FieldType: ${fieldType}, Value: ${value}`);
        try {
            switch (fieldType) {
                case 'msg':
                    if (mode === 'GET') {
                        const retrievedValue = this.RED.util.getMessageProperty(this.msg, fieldName);
                        console.log(`[handleValue] Retrieved from msg: ${retrievedValue}`);
                        return retrievedValue;
                    } else {
                        this.RED.util.setMessageProperty(this.msg, fieldName, value);
                        console.log(`[handleValue] Set to msg: ${value}`);
                    }
                    break;
                case 'flow':
                    if (mode === 'GET') {
                        const retrievedValue = this.node.context().flow.get(fieldName);
                        console.log(`[handleValue] Retrieved from flow: ${retrievedValue}`);
                        return retrievedValue;
                    } else {
                        this.node.context().flow.set(fieldName, value);
                        console.log(`[handleValue] Set to flow: ${value}`);
                    }
                    break;
                case 'global':
                    if (mode === 'GET') {
                        const retrievedValue = this.node.context().global.get(fieldName);
                        console.log(`[handleValue] Retrieved from global: ${retrievedValue}`);
                        return retrievedValue;
                    } else {
                        this.node.context().global.set(fieldName, value);
                        console.log(`[handleValue] Set to global: ${value}`);
                    }
                    break;
                case 'date':
                    if (mode === 'GET') {
                        console.log("[handleValue] Returning current date");
                        return new Date();
                    } else {
                        console.warn("[handleValue] Cannot set a direct date value.");
                    }
                    break;
                case 'str':
                    if (mode === 'GET') {
                        console.log("[handleValue] Returning trimmed string");
                        return fieldName.trim();
                    } else {
                        console.warn("[handleValue] Cannot set value directly to a string target.");
                    }
                    break;
                default:
                    throw new Error(`Invalid value source/type: ${fieldType}`);
            }
        } catch (error) {
            console.warn(`[handleValue] Error in mode ${mode}: ${error.message}. Using fallback.`);
            return mode === 'GET' ? dayjs() : console.warn('Failed to set output');
        }
    }

    // Initialize the date object based on the input
    initializeDate() {
        console.log("[initializeDate] Initializing date with raw input:", this.rawInput);
        if (this.rawInput === '' || this.rawInput === null || this.rawInput === undefined) {
            console.log("[initializeDate] Defaulting to current date/time");
            return dayjs(); // Default to now if the input is empty
        }

        // Handle different input types
        if (typeof this.rawInput === 'string') {
            return this.applyHackOrParse(this.rawInput.trim());
        } else if (typeof this.rawInput === 'number') {
            console.log("[initializeDate] Treating input as a timestamp");
            return dayjs(this.rawInput);
        } else if (this.rawInput instanceof Date) {
            console.log("[initializeDate] Converting Date object to dayjs");
            return dayjs(this.rawInput);
        } else if (typeof this.rawInput === 'object' && this.rawInput !== null) {
            console.log("[initializeDate] Treating input as a dayjs-compatible object");
            return dayjs(this.rawInput);
        } else {
            throw new Error(`Unsupported input type: ${typeof this.rawInput}`);
        }
    }

    // Apply a "hack" or parse the input
    applyHackOrParse(input) {
        console.log("[applyHackOrParse] Processing input:", input);
        const now = dayjs().tz(this.inTz);

        switch (input.toLowerCase()) {
            case 'today': return now;
            case 'tomorrow': return now.add(1, 'day');
            case 'yesterday': return now.subtract(1, 'day');
			case 'next week': return now.add(1, 'week');
			case 'last week': return now.subtract(1, 'week');
			case 'next month': return now.add(1, 'month');
			case 'last month': return now.subtract(1, 'month');
			case 'next minute': return now.add(1, 'minute');
			case 'last minute': return now.subtract(1, 'minute');
			case 'next hour': return now.add(1, 'hour');
			case 'last hour': return now.subtract(1, 'hour');
            // Add more hack keywords as needed
            default:
                console.log("[applyHackOrParse] Attempting to parse input with format:", this.inputFormat);
                const parsedDate = dayjs(input, this.inputFormat, true);
                if (parsedDate.isValid()) {
                    return parsedDate;
                } else {
                    throw new Error(`Invalid date input or unrecognized hack: ${input}`);
                }
        }
    }

    // Adjust the date
    adjustDate() {
        console.log(`[adjustDate] Adjusting date with amount: ${this.adjAmount}, type: ${this.adjType}, direction: ${this.adjDir}`);
        if (this.adjAmount === 0 || !['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'].includes(this.adjType)) {
            console.log("[adjustDate] No adjustment needed.");
            return this; // No adjustment needed
        }
        this.date = (this.adjDir === 'subtract')
            ? this.date.subtract(this.adjAmount, this.adjType)
            : this.date.add(this.adjAmount, this.adjType);

        if (!this.date.isValid()) throw new Error(`Invalid date after adjustment.`);
        return this;
    }

    // Apply timezone adjustment
    applyTimezone() {
        try {
            console.log(`[applyTimezone] Applying timezone: ${this.outTz}`);
            this.date = this.date.tz(this.outTz);
            if (!this.date.isValid()) throw new Error(`Invalid date after applying timezone.`);
            return this;
        } catch (error) {
            console.error(`[applyTimezone] Error applying timezone: ${error.message}`);
            throw error;
        }
    }

    // Format the final output based on the format
    formatOutput() {
        console.log(`[formatOutput] Formatting output with format: "${this.format}"`);
        switch (this.format.toLowerCase()) {
            case 'iso8601': return this.date.toISOString();
            case 'jsdate': return this.date.toDate();
            case 'fromnow': return this.date.fromNow();
            default: return this.date.format(this.format);
        }
    }
}

// Export the module for Node-RED
module.exports = (RED) => {
    function nodeDefinition(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Handle the input event
        node.on('input', (msg, send, done) => {
            try {
                console.log("[Node-RED] Received input message:", msg);
                
                // Pass RED to the DateHandler constructor
                const dateHandler = new DateHandler(config, msg, RED, node);

                dateHandler.adjustDate();
                dateHandler.applyTimezone();

                const finalOutput = dateHandler.formatOutput();
                dateHandler.handleValue('SET', dateHandler.output, dateHandler.outputType, finalOutput);

                // Include all settings in the output
                msg.settings = {
                    'input': dateHandler.input,
                    'input_format': dateHandler.inputFormat,
                    'input_tz': dateHandler.inTz,
                    'output_format': dateHandler.format,
                    'output_locale': dateHandler.locale,
                    'output_tz': dateHandler.outTz
                };

                console.log("[Node-RED] Final output message:", msg);
                send(msg);
                done();
            } catch (error) {
                node.error(`Error processing input: ${error.message}`, msg);
                done(error);
            }
        });
    }
    RED.nodes.registerType('nrday', nodeDefinition);
};