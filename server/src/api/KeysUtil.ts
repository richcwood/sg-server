export default class KeysUtil {

  public static getPrivate(): string {
    return `-----BEGIN RSA PRIVATE KEY-----
    MIICXwIBAAKBgQDR1Uq52X6m1dDXhqFiHfb3tuvBjlapDw2mauGKFbqKLfiGMLRS
    91mO5kDNEoMBILIc7Ube2m8M7p35imO8kSRlPGN1bpV3DYjT3JmIQw8OMBXu/rS3
    IzNzQwvw12SES51rxpOQFGJ427QfVjijil1Veu6We8Qkejdrj+LNE63rqQIDAQAB
    AoGBALfPMLtmw6RfzqbN35b0ir/qM9EE3/MOJbXvEI0Ghba/mGHsTjoTRReBqag6
    nBmjy4K9c4SKMhdQ+3958+5d8lNJu9DQ6gd4wOOS+uVxriS4PS6YZIOpzr6hxELV
    BG1wpnGqtTbW9qRD5sbM5X0yymwxnLVCsj3kQAdvIXFk/h4BAkEA8ql+zxMqLNCt
    UWUQT4LcaEwK42QMDu9FYwXJmUL5oIpLKA8BgDfGhw0FediH2cvo9IMBDhEeS8A0
    IjCtxDmm6QJBAN1d3CZbWOIONTKH8qvZeJ0VQLaknPEkww+T57X2eO3ZBtSvQrRE
    Qqa5hf+n01eHH4gmn0yom/Xell1ktSycpsECQQC7QVqu1x4rmRi1/+Q3R0doYI3i
    bVj0yWVlBZlNYKabYTyf+/xvghr8Kms4XIRw6G6rCNDulv0m/Xn9jEz7aHXJAkEA
    rCH9O3JStk1X/ngKMqlDidpp3Nw6EaWFbIqVZkBHHqRhFGdIFkbyERU4ZmkJBQnU
    chmeS4zc4Z55DBxwaUVSwQJBALul7sZuoUteO/ModaltXy3obsiBYI6uG3z2MqoL
    xDPVpJ0eLSzkjI4iAEWcBE/wMwB0K3/ma7cU90Fybf4aeKA=
    -----END RSA PRIVATE KEY-----`;
  }

  public static getPublic(): string {
    return `-----BEGIN PUBLIC KEY-----
    MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDR1Uq52X6m1dDXhqFiHfb3tuvB
    jlapDw2mauGKFbqKLfiGMLRS91mO5kDNEoMBILIc7Ube2m8M7p35imO8kSRlPGN1
    bpV3DYjT3JmIQw8OMBXu/rS3IzNzQwvw12SES51rxpOQFGJ427QfVjijil1Veu6W
    e8Qkejdrj+LNE63rqQIDAQAB
    -----END PUBLIC KEY-----`;
  }
}