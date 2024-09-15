declare module 'email-forward-parser' {
  class EmailForwardParser {
    read(
      body: string,
      subject?: string,
    ): {
      forwarded: boolean
      message: string | null
      email: {
        body: string
        from: {
          address: string
          name: string | null
        }
        to:
          | {
              address: string
              name: string | null
            }
          | {
              address: string
              name: string | null
            }[]
          | null
          | undefined
        cc:
          | {
              address: string
              name: string | null
            }
          | {
              address: string
              name: string | null
            }[]
          | null
          | undefined
        subject: string | null
        date: string | null
      }
    }
  }

  export default EmailForwardParser
}
