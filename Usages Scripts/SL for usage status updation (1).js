/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function onRequest(context) {
        try {
            log.debug('Suitelet started', 'Processing request');

            const request = context.request;
            const usageId = request.parameters.usageId;
          //  const sfUphInternalId = request.parameters.sfUphInternalId;

            log.debug('Received Parameters', { usageId});

            // Fetch usage record status
            const usageStatus = getUsageStatus(usageId);
            log.debug('Usage Status', usageStatus);

            if (usageStatus && usageStatus !== 'ACTIVE') {
                // Fetch custom record internal id
                const usageCustomRecordInternalId = getCustomRecordInternalId(usageId);

                if (usageCustomRecordInternalId) {
                    updateCustomRecordStatus(usageCustomRecordInternalId, usageStatus);
                    log.audit('Custom Record Updated', usageCustomRecordInternalId);
                } else {
                    log.audit('No Custom Record Found',usageId);
                }
            }

            context.response.write('Suitelet processed successfully');

        } catch (e) {
            log.error('Error in Suitelet Script', e);
            context.response.write('Error: ' + e.message);
        }
    }

    // Helper function to get usage status
    function getUsageStatus(usageId) {
        const usageSearch = search.create({
            type: "usage",
            filters: [
                ["internalid", "anyof", usageId]
            ],
            columns: [
                search.createColumn({ name: "status", label: "Status" })
            ]
        });

        const results = usageSearch.run().getRange({ start: 0, end: 1 });
        if (results && results.length > 0) {
            return results[0].getValue({ name: "status", label: "Status" });
        }
        return null;
    }

    // Helper function to get custom record internal id
    function getCustomRecordInternalId(usage_Id) {
        const customRecordSearch = search.create({
            type: "customrecord_usage_status_record",
            filters: [
                ["custrecord_usage_internal_id", "is", usage_Id]
            ],
            columns: [
                search.createColumn({ name: "internalid", label: "Internal ID" })
            ]
        });

        const results = customRecordSearch.run().getRange({ start: 0, end: 1 });
        if (results && results.length > 0) {
            return results[0].getValue({ name: "internalid", label: "Internal ID" });
        }
        return null;
    }

    // Helper function to update custom record status
    function updateCustomRecordStatus(recordId, status) {
        record.submitFields({
            type: 'customrecord_usage_status_record',
            id: recordId,
            values: {
              custrecord_usage_status: status ,
              custrecord_sync_to_salesforce: true
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });
    }

    return {
        onRequest: onRequest
    };
});
