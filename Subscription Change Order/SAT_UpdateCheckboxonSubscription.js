/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmitToUpdateSubscriptionCheckbox(context) {
        try {
            var newRecord = context.newRecord;

            // Get the subscription ID from the current record
            var changeOrderSubscription = newRecord.getValue({ fieldId: 'subscription' });
           // log.debug('Change Order Subscription', changeOrderSubscription);

            if (!changeOrderSubscription) {
                log.debug('No subscription ID found on record, skipping update');
                return;
            }

            // Load the subscription record first
            var subscriptionRecord = record.load({
                type: 'subscription',
                id: changeOrderSubscription,
                isDynamic: false
            });

            // Update the field
            subscriptionRecord.setValue({
                fieldId: 'custrecord_subscription_status_changed',
                value: true
            });

            // Save the subscription record
            subscriptionRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug('Subscription updated successfully', changeOrderSubscription);

        } catch (err) {
            log.error({
                title: 'Error in afterSubmitToUpdateSubscriptionCheckbox',
                details: err
            });
        }
    }

    return {
        afterSubmit: afterSubmitToUpdateSubscriptionCheckbox
    };

});
