function serviceMap(service: string, access_token: string, expiry_date: number, refresh_token: string) {
    switch (service) {
        case "gmail":
            return {
                gmailAccessToken: access_token,
                gmailAccessTokenExpiryDate: expiry_date,
                gmailRefreshToken: refresh_token
            }

        case "calendar":
            return {
                calendarAccessToken: access_token,
                calendarAccessTokenExpiryDate: expiry_date,
                calendarRefreshToken: refresh_token
            }
    }
}

export default serviceMap