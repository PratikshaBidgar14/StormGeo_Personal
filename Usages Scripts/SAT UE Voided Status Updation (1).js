/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/search', 'N/https'], function (record, log, search, https) {

    function afterSubmit_createOrUpdateUsageLog(context) {
        try {
            var newRecord = context.newRecord;
            var usageId = newRecord.id;
            var usageStatus = newRecord.getValue({ fieldId: 'status' });
            var sfUphInternalId = newRecord.getValue({ fieldId: 'custrecord155' });

            log.debug({
                title: 'Usage Info',
                details: {
                    usageId: usageId,
                    usageStatus: usageStatus,
                    sfUphInternalId: sfUphInternalId
                }
            });

            if (context.type === context.UserEventType.CREATE) {
                // --- CREATE MODE ---
                log.debug({
                    title: 'CREATE Event',
                    details: 'Creating new custom usage log record'
                });

                var usageLogRec = record.create({
                    type: 'customrecord_usage_status_record',
                    isDynamic: true
                });

                usageLogRec.setValue({ fieldId: 'name', value: sfUphInternalId });
                usageLogRec.setValue({ fieldId: 'custrecord_usage_internal_id', value: usageId });
                usageLogRec.setValue({ fieldId: 'custrecord_usage_status', value: 'ACTIVE' });
                usageLogRec.setValue({ fieldId: 'custrecord_sf_uph_internal_id', value: sfUphInternalId });
              usageLogRec.setValue({ fieldId: 'custrecord_sync_to_salesforce', value: true});
              

                var savedId = usageLogRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.audit({
                    title: 'Custom Usage Log Created',
                    details: 'ID: ' + savedId
                });

            } else if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.DELETE) {
                // --- EDIT / DELETE MODE ---
                log.debug({
                    title: 'EDIT / DELETE Event',
                    details: context.type
                });

                var response = https.requestSuitelet({
                    scriptId: "customscript_sat_sl_usage_status_updatio",
                    deploymentId: "customdeploy_sat_sl_usage_status_updatio",
                    urlParams: {
                        usageId: usageId,
                        sfUphInternalId: sfUphInternalId
                    }
                });

                log.debug({
                    title: 'Suitelet Response',
                    details: response.body
                });
            } else {
                log.debug({
                    title: 'Other Event',
                    details: 'No action taken for this event type: ' + context.type
                });
            }

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
