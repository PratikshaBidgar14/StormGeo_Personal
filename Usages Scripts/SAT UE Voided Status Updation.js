/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/search','N/url', 'N/https'], function(record, log, search,url, https) {

    function afterSubmit_createOrUpdateUsageLog(context) {
        try {
            // Run only on EDIT
            if (context.type !== context.UserEventType.EDIT) {
                log.debug('Not an EDIT event', 'Skipping...');
                return;
            }

            var newRecord = context.newRecord;
            var usageId = newRecord.id;
            log.debug('usage id', usageId);

            // Get field values from the Usage record
            var usageStatus = newRecord.getValue({ fieldId: 'status' });
            var sfUphInternalId = newRecord.getValue({ fieldId: 'custrecord155' });

            log.debug('Usage Info', {
                usageId: usageId,
                status: usageStatus,
                sfUphInternalId: sfUphInternalId
            });

            // --- STEP 1: Search for existing custom record ---
            var existingRecId = null;

            var customRecordSearch = search.create({
                type: 'customrecord_usage_status_record',
                filters: [
                    ['custrecord_usage_internal_id', 'is', usageId]
                ],
                columns: ['internalid']
            });

            customRecordSearch.run().each(function(result) {
                existingRecId = result.id;
                return false; // stop after first match
            });

            // --- STEP 2: Create or update ---
            var usageLogRec;
            if (existingRecId) {
                log.debug('Existing record found', 'Updating ID: ' + existingRecId);
                usageLogRec = record.load({
                    type: 'customrecord_usage_status_record',
                    id: existingRecId,
                    isDynamic: true
                });
            } else {
                log.debug('No existing record found', 'Creating new record');
                usageLogRec = record.create({
                    type: 'customrecord_usage_status_record',
                    isDynamic: true
                });

                // Set record name on new creation
                usageLogRec.setValue({
                    fieldId: 'name',
                    value: sfUphInternalId
                });

                // Set the Usage Internal ID link
                usageLogRec.setValue({
                    fieldId: 'custrecord_usage_internal_id',
                    value: usageId
                });
            }

            // --- STEP 3: Update/Set common fields ---
            usageLogRec.setValue({
                fieldId: 'custrecord_usage_status',
                value: usageStatus
            });

            usageLogRec.setValue({
                fieldId: 'custrecord_sf_uph_internal_id',
                value: sfUphInternalId
            });

            // --- STEP 4: Save record ---
            var savedId = usageLogRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.audit('Custom Usage Log Updated/Created', 'ID: ' + savedId);


       var response = https.requestSuitelet({
    scriptId: "customscript_sat_sl_usage_status_updatio",
    deploymentId: "customdeploy_sat_sl_usage_status_updatio",
    urlParams: {
        usageId: usageId,
      sfUphInternalId:sfUphInternalId
    }
});
          log.debug('response',response.body);

        } catch (err) {
            log.error({
                title: 'Error in afterSubmit_createOrUpdateUsageLog',
                details: err
            });
        }
    }

    return {
        afterSubmit: afterSubmit_createOrUpdateUsageLog
    };
});
