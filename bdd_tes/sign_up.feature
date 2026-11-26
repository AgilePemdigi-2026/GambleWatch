Feature: Melakukan Sign Up
In order to membuat akun masyarakat
As a masyarakat
I want to melakukan sign up

Background:
Given the authentication service is simulated

Scenario: Sign Up berhasil
Given I am on the "/sign-up" page
When I fill in "NAMA LENGKAP" with "Rahmadevi"
And I fill in "EMAIL" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "password123"
And I fill in "KONFIRMASI PASSWORD" with "password123"
And I press "DAFTAR"
Then I should see the message "Pendaftaran berhasil"
And a sign up request for "rahmadevi@gmail.com" should be sent

Scenario: Sign Up dengan field kosong
Given I am on the "/sign-up" page
When I leave "NAMA LENGKAP" empty
And I leave "EMAIL" empty
And I leave "PASSWORD" empty
And I press "DAFTAR"
Then the browser should show a validation message on "NAMA LENGKAP"
And I should remain on the "/sign-up" page
And no account data should be sent to the authentication service

Scenario: Sign Up gagal karena konfirmasi password tidak cocok
Given I am on the "/sign-up" page
When I fill in "NAMA LENGKAP" with "Rahmadevi"
And I fill in "EMAIL" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "password123"
And I fill in "KONFIRMASI PASSWORD" with "password456"
And I press "DAFTAR"
Then I should see the message "Konfirmasi password tidak cocok."
And I should remain on the "/sign-up" page
And no account data should be sent to the authentication service
