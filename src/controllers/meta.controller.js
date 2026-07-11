import Lead from "../models/Lead.js";

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";

const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/**
 * Return the first available Meta form value.
 */
const getFieldValue = (fields, ...possibleNames) => {
  for (const name of possibleNames) {
    const matchedField = fields.find(
      (item) =>
        String(item?.name || "").toLowerCase() === String(name).toLowerCase(),
    );

    const value = matchedField?.values?.[0];

    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }

  return "";
};

/**
 * Normalize phone numbers for duplicate checking.
 */
const normalizePhone = (phone) => {
  return String(phone || "")
    .replace(/[^\d+]/g, "")
    .trim();
};

/**
 * Fetch an object from Meta Graph API.
 */
const fetchMetaObject = async (objectId, fields = "") => {
  if (!objectId) return null;

  const url = new URL(`${META_GRAPH_URL}/${encodeURIComponent(objectId)}`);

  if (fields) {
    url.searchParams.set("fields", fields);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
    },
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(
      data?.error?.message ||
        `Meta API request failed with status ${response.status}`,
    );
  }

  return data;
};

/**
 * Fetch optional Meta information without blocking lead creation.
 */
const safelyFetchMetaObject = async (objectId, fields) => {
  if (!objectId) return null;

  try {
    return await fetchMetaObject(objectId, fields);
  } catch (error) {
    console.error(`Unable to fetch Meta object ${objectId}:`, error.message);

    return null;
  }
};

/**
 * Meta calls this GET endpoint when verifying the webhook.
 */
export const verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const receivedToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const tokenMatched = receivedToken === process.env.META_VERIFY_TOKEN;

  console.log("Meta webhook verification:", {
    mode,
    tokenMatched,
  });

  if (mode === "subscribe" && tokenMatched) {
    return res.status(200).type("text/plain").send(challenge);
  }

  return res.sendStatus(403);
};

/**
 * Receive Meta Lead Ads webhook events.
 */
export const receiveMetaLead = async (req, res) => {
  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        /*
         * Ignore Page webhook events that are not Lead Ads.
         */
        if (change?.field !== "leadgen") {
          continue;
        }

        const webhookData = change?.value || {};

        const leadgenId = webhookData.leadgen_id;
        const webhookFormId = webhookData.form_id;
        const webhookAdId = webhookData.ad_id;

        if (!leadgenId) {
          console.warn("Meta webhook received without leadgen_id");
          continue;
        }

        try {
          /*
           * First duplicate check using Meta's unique lead ID.
           */
          const metaLeadExists = await Lead.exists({
            metaLeadId: String(leadgenId),
          });

          if (metaLeadExists) {
            console.log(`Meta lead already exists: ${leadgenId}`);
            continue;
          }

          /*
           * Retrieve the actual form answers using leadgen_id.
           */
          const metaLeadData = await fetchMetaObject(
            leadgenId,
            [
              "id",
              "created_time",
              "field_data",
              "form_id",
              "ad_id",
              "campaign_id",
            ].join(","),
          );

          const fields = Array.isArray(metaLeadData?.field_data)
            ? metaLeadData.field_data
            : [];

          /*
           * Keep this log during initial testing.
           * It shows the exact names of your Instant Form fields.
           */
          console.log("Meta lead fields:", JSON.stringify(fields, null, 2));

          const firstName = getFieldValue(fields, "first_name");

          const lastName = getFieldValue(fields, "last_name");

          const clientName =
            getFieldValue(fields, "full_name", "name", "customer_name") ||
            [firstName, lastName].filter(Boolean).join(" ") ||
            "Meta Lead";

          const phone = normalizePhone(
            getFieldValue(
              fields,
              "phone_number",
              "phone",
              "mobile_number",
              "contact_number",
            ),
          );

          const email = getFieldValue(
            fields,
            "email",
            "email_address",
          ).toLowerCase();

          const company = getFieldValue(
            fields,
            "company_name",
            "business_name",
            "company",
          );

          const service =
            getFieldValue(
              fields,
              "service",
              "services",
              "service_interested",
              "service_required",
              "which_service_are_you_interested_in",
            ) || "Other";

          const budget = getFieldValue(
            fields,
            "budget",
            "project_budget",
            "estimated_budget",
            "your_budget",
          );

          const requirement = getFieldValue(
            fields,
            "message",
            "requirement",
            "project_requirement",
            "tell_us_about_your_requirement",
          );

          /*
           * Phone is required in your Lead schema.
           * Make phone mandatory in your Meta Instant Form.
           */
          if (!phone) {
            console.error(
              `Meta lead ${leadgenId} skipped because phone is missing`,
            );
            continue;
          }

          /*
           * Check whether phone or email already exists.
           */
          const duplicateConditions = [
            {
              metaLeadId: String(leadgenId),
            },
            {
              phone,
            },
          ];

          if (email) {
            duplicateConditions.push({
              email,
            });
          }

          const duplicateLead = await Lead.findOne({
            $or: duplicateConditions,
          }).select("_id clientName phone email metaLeadId");

          if (duplicateLead) {
            console.log("Duplicate CRM lead skipped:", {
              metaLeadId: leadgenId,
              existingLeadId: duplicateLead._id,
            });

            continue;
          }

          const formId = metaLeadData?.form_id || webhookFormId || "";

          const adId = metaLeadData?.ad_id || webhookAdId || "";

          const campaignId = metaLeadData?.campaign_id || "";

          /*
           * Fetch readable form, ad and campaign names.
           * A failure here will not stop the lead from saving.
           */
          const [formData, adData, campaignData] = await Promise.all([
            safelyFetchMetaObject(formId, "id,name"),
            safelyFetchMetaObject(adId, "id,name"),
            safelyFetchMetaObject(campaignId, "id,name"),
          ]);

          const messageParts = ["Lead received from Meta Ads lead form."];

          if (requirement) {
            messageParts.push(`Requirement: ${requirement}`);
          }

          const createdLead = await Lead.create({
            clientName,
            phone,
            email: email || undefined,
            company: company || undefined,

            service,
            budget: budget || undefined,
            message: messageParts.join("\n"),

            source: "Meta Ads",

            metaLeadId: String(leadgenId),

            formName: formData?.name || undefined,

            adName: adData?.name || undefined,

            campaignName: campaignData?.name || undefined,

            status: "New",
            priority: "Warm",
          });

          console.log("Meta lead successfully saved:", {
            crmLeadId: createdLead._id,
            metaLeadId: leadgenId,
            clientName,
            formName: formData?.name || "",
            adName: adData?.name || "",
            campaignName: campaignData?.name || "",
          });
        } catch (leadError) {
          /*
           * Prevent failure if Meta sends the webhook twice.
           */
          if (leadError?.code === 11000) {
            console.log(`Duplicate Meta lead ignored: ${leadgenId}`);

            continue;
          }

          console.error(`Error processing Meta lead ${leadgenId}:`, leadError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Meta webhook processed successfully",
    });
  } catch (error) {
    console.error("Meta webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Meta webhook failed",
    });
  }
};
