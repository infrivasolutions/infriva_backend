import Lead from "../models/Lead.js";

export const verifyMetaWebhook = (req, res) => {
  console.log("MODE:", req.query["hub.mode"]);
  console.log("TOKEN:", req.query["hub.verify_token"]);
  console.log("ENV:", process.env.META_VERIFY_TOKEN);

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const receiveMetaLead = async (req, res) => {
  try {
    const entries = req.body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const leadgenId = change?.value?.leadgen_id;
        const formId = change?.value?.form_id;

        if (!leadgenId) continue;

        const exists = await Lead.findOne({ metaLeadId: leadgenId });
        if (exists) continue;

        const metaRes = await fetch(
          `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${process.env.META_ACCESS_TOKEN}`,
        );

        const metaData = await metaRes.json();

        if (!metaRes.ok || metaData.error) {
          console.log("Meta Lead Fetch Error:", metaData);
          continue;
        }

        const fields = metaData.field_data || [];

        const getField = (name) =>
          fields.find((item) => item.name === name)?.values?.[0] || "";

        const fullName =
          getField("full_name") ||
          getField("name") ||
          getField("first_name") ||
          "Meta Lead";

        const phone =
          getField("phone_number") || getField("phone") || "Not Provided";

        const email = getField("email");

        const duplicateChecks = [{ metaLeadId: leadgenId }];

        if (phone && phone !== "Not Provided") {
          duplicateChecks.push({ phone });
        }

        if (email) {
          duplicateChecks.push({ email });
        }

        const existingLead = await Lead.findOne({
          $or: duplicateChecks,
        });

        if (existingLead) continue;

        await Lead.create({
          clientName: fullName,
          phone,
          email,
          service: "Other",
          source: "Meta Ads",
          metaLeadId: leadgenId,
          formName: formId || "",
          message: "Lead received from Meta Ads lead form.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Meta lead received",
    });
  } catch (error) {
    console.error("Meta Webhook Error:", error);
    return res.status(500).json({
      success: false,
      message: "Meta webhook failed",
    });
  }
};
