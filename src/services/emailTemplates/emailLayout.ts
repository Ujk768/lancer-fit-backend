export function emailLayout(
  title: string,
  content: string,
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#0C1530;
          font-family:Arial,sans-serif;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            background:#0C1530;
            padding:40px 20px;
          "
        >
          <tr>
            <td align="center">
              <table
                width="520"
                cellpadding="0"
                cellspacing="0"
                style="
                  background:#13214D;
                  border:1px solid rgba(225,235,250,0.20);
                  border-radius:22px;
                  overflow:hidden;
                "
              >
                <tr>
                  <td style="padding:32px;">
                    <h1
                      style="
                        margin:0;
                        color:#FFD157;
                        font-size:30px;
                      "
                    >
                      LancerFit
                    </h1>

                    <p
                      style="
                        margin:8px 0 28px;
                        color:#A8BBD4;
                        line-height:1.6;
                      "
                    >
                      Built for the Toldo Lancer Centre experience.
                    </p>

                    <h2
                      style="
                        margin:0 0 18px;
                        color:#EEF3FA;
                      "
                    >
                      ${title}
                    </h2>

                    ${content}

                    <hr
                      style="
                        border:none;
                        border-top:1px solid rgba(225,235,250,0.12);
                        margin:28px 0;
                      "
                    />

                    <p
                      style="
                        margin:0;
                        font-size:12px;
                        color:#6E84A4;
                        line-height:1.6;
                      "
                    >
                      © LancerFit • University of Windsor
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}