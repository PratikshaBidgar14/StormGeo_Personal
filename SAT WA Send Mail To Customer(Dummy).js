/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/log', 'N/record', 'N/email', 'N/runtime', 'N/render', 'N/search', 'N/file'], 
  (log, record, email, runtime, render, search, file) => {

    const onAction = (context) => {
        try {
            const creditMemo = context.newRecord;
            const creditMemoId = creditMemo.id;

            const entityId = creditMemo.getValue({ fieldId: 'entity' });
            const tranId = creditMemo.getValue({ fieldId: 'tranid' });
            const tranDate = creditMemo.getValue({ fieldId: 'trandate' });
            const total = creditMemo.getValue({ fieldId: 'total' });
            const createdFrom = creditMemo.getText({ fieldId: 'createdfrom' }) || 'N/A';
            const subsidiaryId = creditMemo.getValue({ fieldId: 'subsidiary' });

            // Subsidiary-specific config
            const subsidiaryConfig = {
                "11": {
                    companyName: "Tavant HEADQUARTERS",
                    footerBlock: `<strong>Tavant HEADQUARTERS</strong><br />
                        Tower B, Terminal One,402, Phase 1<br />
                        Hinjawadi Rajiv Gandhi Infotech Park,<br />
                        Dubai, United Arab Emirates<br />
                        PO 102628<br />
                        Email: <a href="mailto:accounts.dubai@stormgeo.com" style="color:blue; text-decoration:underline;">accounts.dubai@stormgeo.com</a><br />
                        Phone: +971 04 4467499`,
                    auth: 38288
                },
                "13": {
                    companyName: "StormGeo GmbH",
                    footerBlock: `<strong>StormGeo GmbH</strong><br />
                        Gasstraße 18, Haus 6a<br />
                        22761 Hamburg<br />
                        Germany<br />
                        Email: <a href="mailto:invoice.de@stormgeo.com" style="color:blue; text-decoration:underline;">invoice.de@stormgeo.com</a>`,
                    auth: 35983
                },
                "16": {
                    companyName: "StormGeo Denmark A/S",
                    footerBlock: `<strong>StormGeo Denmark A/S</strong><br />
                        C/O Alfa Laval Copenhagen A/S<br />
                        Maskinvej 5<br />
                        Søborg 2860<br />
                        Denmark<br />
                        Email: <a href="mailto:invoice.dk@stormgeo.com" style="color:blue; text-decoration:underline;">Invoice.dk@stormgeo.com</a>`,
                    auth: 50290
                },
                "14": {
                    companyName: "StormGeo Ltd",
                    footerBlock: `<strong>StormGeo Ltd</strong><br />
                        Unit 6 Kingshall Business Park<br />
                        Venture Drive, Westhill, Aberdeenshire AB32 6FL,<br />
                        United Kingdom<br />
                        Email: <a href="mailto:stormgeoltd.invoice@stormgeo.com" style="color:blue; text-decoration:underline;">UKAccounts@stormgeo.com</a>`,
                    auth: 50291
                },
                "15": {
                    companyName: "StormGeo AB",
                    footerBlock: `<strong>StormGeo AB</strong><br />
                        Korgmakargränd 6<br />
                        4tr<br />
                        111 22<br />
                        Sweden<br />
                        Email: <a href="mailto:ab-invoice@stormgeo.com" style="color:blue; text-decoration:underline;">ab-invoice@stormgeo.com</a>`,
                    auth: 50292
                },
                "17": {
                    companyName: "StormGeo UAB",
                    footerBlock: `<strong>StormGeo UAB</strong><br />
                        K. Kalinausko gatvė 2 b<br />
                        4th floor, Vilnius LT03107<br />
                        Lithuania<br />
                        Email: <a href="mailto:Invoice.lt@stormgeo.com" style="color:blue; text-decoration:underline;">Invoice.lt@stormgeo.com</a>`,
                    auth: 50293
                }
            };

            const selectedSubsidiary = subsidiaryConfig[subsidiaryId] || {
                companyName: "StormGeo Group",
                footerBlock: `<strong>StormGeo Group</strong><br />Global Office<br />Worldwide`,
                auth: runtime.getCurrentUser().id
            };

            // Load customer
            const customerRecord = record.load({
                type: record.Type.CUSTOMER,
                id: entityId
            });

            const companyName = customerRecord.getValue('companyname') || '';
            const customerEmail = customerRecord.getValue('email');

            if (!customerEmail) {
                log.debug('No email found for customer', 'Credit Memo: ' + tranId);
                return;
            }

            // Build email body
            let body = `<p>Dear ${companyName},</p>
                <p>We hope this email finds you well. We would like to inform you that a <strong>Credit Memo</strong> has been created against your account.</p>
                <p><strong>Credit Memo Details:</strong></p>
                <ul>
                    <li><strong>Credit Memo Number:</strong> ${tranId}</li>
                    <li><strong>Date Issued:</strong> ${tranDate}</li>
                    <li><strong>Amount:</strong> ${total}</li>
                    <li><strong>Created From:</strong> ${createdFrom}</li>
                </ul>
                <p>This credit can be applied against your future invoices or refunded as per our company policy.</p>
                <p>If you have any questions regarding this credit memo, please feel free to reach out to us.</p>
                <p>Thank you for your continued partnership.</p>` + selectedSubsidiary.footerBlock;

            // Generate PDF of the credit memo
            const pdfFile = render.transaction({
                entityId: creditMemoId,
                printMode: render.PrintMode.PDF
            });

            // Collect attachments: PDF + any attached files
            const attachments = [pdfFile];

            const fileSearch = search.create({
                type: 'creditmemo',
                filters: [
                    ['type', 'anyof', 'CustCred'],
                    'AND',
                    ['internalidnumber', 'equalto', creditMemoId],
                    'AND',
                    ['mainline', 'is', 'T']
                ],
                columns: [
                    search.createColumn({ name: 'internalid', join: 'file' }),
                    search.createColumn({ name: 'name', join: 'file' })
                ]
            });

            const fileResults = fileSearch.run().getRange({ start: 0, end: 10 });
            fileResults.forEach(result => {
                const fileId = result.getValue({ name: 'internalid', join: 'file' });
                if (fileId) {
                    try {
                        const f = file.load({ id: fileId });
                        attachments.push(f);
                    } catch (err) {
                        log.error('File load error', err);
                    }
                }
            });

            // Send the email
            email.send({
                author: selectedSubsidiary.auth,
                recipients: customerEmail,
                subject: 'Credit Note',
                body: body,
                fromName: selectedSubsidiary.companyName,
                attachments: attachments,
                relatedRecords: {
                    transactionId: creditMemoId
                },
                isBodyHtml: true
            });

        } catch (e) {
            log.error('Error sending credit memo email', e);
        }
    };

    return { onAction };
});
