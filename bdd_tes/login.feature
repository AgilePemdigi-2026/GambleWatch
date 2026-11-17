Feature: Melakukan Login
In order to mengakses fitur masyarakat yang membutuhkan akun
As a masyarakat
I want to melakukan login

Scenario: Login berhasil
Given I am on the "/sign-in" page
And I select "MASYARAKAT"
When I fill in "EMAIL / NIK" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "password123"
And I press "AUTHENTICATE"
Then I should be redirected to the "/landing-page" page
And I should see that I have successfully logged in

Scenario: Login gagal karena field kosong
Given I am on the "/sign-in" page
And I select "MASYARAKAT"
When I leave "EMAIL / NIK" empty
And I leave "PASSWORD" empty
And I press "AUTHENTICATE"
Then I should see a login validation message
And I should remain on the "/sign-in" page

Scenario: Login gagal karena email/NIK tidak terdaftar
Given I am on the "/sign-in" page
And I select "MASYARAKAT"
When I fill in "EMAIL / NIK" with "unknownuser@gmail.com"
And I fill in "PASSWORD" with "password123"
And I press "AUTHENTICATE"
Then I should see a message that the email/NIK is not registered
And I should remain on the "/sign-in" page

Scenario: Login gagal karena password salah
Given I am on the "/sign-in" page
And I select "MASYARAKAT"
When I fill in "EMAIL / NIK" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "wrongpassword123"
And I press "AUTHENTICATE"
Then I should see a message that the email or password is incorrect
And I should remain on the "/sign-in" page
